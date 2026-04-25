-- Migration 005: Add folders, conversations, messages tables and AI annotation columns.
-- Supports: user-editable bookmark folders (single-folder per bookmark, matches X.com semantics),
-- persistent AI conversations (Signal rail), and per-bookmark AI summaries + tag confidence scores.

-- ── Folders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  x_folder_id   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, x_folder_id)
);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY folders_select_own ON folders FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY folders_insert_own ON folders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_update_own ON folders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_delete_own ON folders FOR DELETE
  USING (user_id = auth.uid());

-- ── Bookmarks: folder assignment + AI annotations + user notes ───────
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS folder_id   uuid REFERENCES folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_summary  text,
  ADD COLUMN IF NOT EXISTS ai_tags     jsonb,
  ADD COLUMN IF NOT EXISTS user_notes  text;

CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);

-- ── Conversations (persisted HAL chats) ──────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New conversation',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_own ON conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY conversations_insert_own ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_update_own ON conversations FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_delete_own ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- ── Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('user', 'assistant')),
  content             text NOT NULL,
  cited_bookmark_ids  jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select_own ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY messages_insert_own ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY messages_delete_own ON messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));

-- ── updated_at triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_set_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
