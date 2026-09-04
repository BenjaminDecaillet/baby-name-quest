// Repository quality gate: verifies that every tracked text file is UTF-8
// without BOM, uses LF line endings, and contains no token-like secret or
// forbidden wording. Cross-platform (Node only), used by `npm run check:repo`
// and by CI.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.zip', '.pdf']);
const TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]{10,}\b/,
];
const FORBIDDEN_WORDING = [/co-authored-by/i, /generated with/i, /\bclaude\b/i, /anthropic/i];
// Files allowed to mention the forbidden wording because they implement the check itself.
const SELF_REFERENCING = new Set([
  'scripts/check-repo.ts',
  'scripts/hooks/commit-msg.mjs',
  '.claude/skills/project-conventions/SKILL.md',
  'CLAUDE.md',
]);

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const problems: string[] = [];
for (const relative of tracked) {
  const absolute = path.join(root, relative);
  const extension = path.extname(relative).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) continue;
  if (!statSync(absolute, { throwIfNoEntry: false })?.isFile()) continue;
  const buffer = readFileSync(absolute);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    problems.push(`${relative}: UTF-8 BOM`);
  }
  if (buffer.includes('\r\n')) problems.push(`${relative}: CRLF line endings`);
  const text = buffer.toString('utf8');
  if (text.includes('�')) problems.push(`${relative}: invalid UTF-8 sequence`);
  for (const pattern of TOKEN_PATTERNS) {
    if (pattern.test(text)) problems.push(`${relative}: token-like secret (${pattern})`);
  }
  const normalized = relative.replaceAll('\\', '/');
  const isDataset = normalized.startsWith('public/data/') || normalized === 'data/origins.json';
  if (!SELF_REFERENCING.has(normalized) && !isDataset) {
    for (const pattern of FORBIDDEN_WORDING) {
      if (pattern.test(text)) problems.push(`${relative}: forbidden wording (${pattern})`);
    }
  }
}

if (problems.length > 0) {
  console.error(`check:repo found ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`check:repo OK (${tracked.length} tracked files verified)`);
