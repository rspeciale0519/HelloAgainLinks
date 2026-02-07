import { z } from 'zod';

// ============================================================
// Zod Schemas for HelloAgain API validation
// ============================================================

export const createBookmarkSchema = z.object({
  x_post_id: z.string().min(1),
  x_author_handle: z.string().optional(),
  x_author_name: z.string().optional(),
  content_text: z.string().optional(),
  media_urls: z.array(z.string()).optional().default([]),
  post_created_at: z.string().optional(),
  bookmarked_at: z.string().optional(),
});

export const updateBookmarkSchema = z.object({
  x_author_handle: z.string().optional(),
  x_author_name: z.string().optional(),
  content_text: z.string().optional(),
  media_urls: z.array(z.string()).optional(),
});

export const listBookmarksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['bookmarked_at', 'post_created_at', 'created_at']).default('bookmarked_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  author: z.string().optional(),
  folder_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
});

export const searchBookmarksSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  author: z.string().optional(),
  folder_id: z.string().uuid().optional(),
  tag_id: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const addTagsSchema = z.object({
  tag_ids: z.array(z.string().uuid()).min(1).max(20),
});

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().optional(),
});

export const addFoldersSchema = z.object({
  folder_ids: z.array(z.string().uuid()).min(1).max(10),
});

// Plan limits
export const PLAN_LIMITS = {
  free: { bookmarks: 500, folders: 5, tags: 20 },
  pro: { bookmarks: Infinity, folders: Infinity, tags: Infinity },
  lifetime: { bookmarks: Infinity, folders: Infinity, tags: Infinity },
} as const;
