import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const LIVE_TOKEN = /vck_[A-Za-z0-9]{8,}|vcp_[A-Za-z0-9]{8,}|sk_live_[A-Za-z0-9]{8,}/;

// Known fixtures / owner-action files. Do not add new exceptions.
const ALLOW = new Set([
  '.claude/hooks/verify/verify-hooks.js', // fake sk_live_abcdefghij PII-scanner fixture
  '.claude/settings.local.json', // live Vercel tokens — owner must rotate + untrack
]);

describe('tracked secrets', () => {
  it('does not introduce new live token prefixes in git', () => {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim();
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    const hits: string[] = [];
    for (const file of files) {
      if (ALLOW.has(file)) continue;
      if (file.endsWith('pnpm-lock.yaml') || file.endsWith('.lock')) continue;
      let text = '';
      try {
        text = readFileSync(join(root, file), 'utf8');
      } catch {
        continue;
      }
      if (LIVE_TOKEN.test(text)) hits.push(file);
    }
    expect(hits).toEqual([]);
  });
});
