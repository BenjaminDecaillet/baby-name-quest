// Husky pre-commit hook: reject staged text files that contain a token-like
// secret, a UTF-8 BOM or CRLF line endings. Pure Node, no shell tools.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}\b/, // JWT (Supabase keys)
  /\bsb_(secret|publishable)_[A-Za-z0-9_-]{10,}\b/,
];
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.zip', '.pdf']);

const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean);

const problems = [];
for (const file of staged) {
  if (!existsSync(file)) continue;
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) continue;
  const buffer = readFileSync(file);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    problems.push(`${file}: UTF-8 BOM detected`);
  }
  if (buffer.includes('\r\n')) {
    problems.push(`${file}: CRLF line endings detected`);
  }
  const text = buffer.toString('utf8');
  for (const pattern of TOKEN_PATTERNS) {
    if (pattern.test(text)) problems.push(`${file}: looks like it contains a secret (${pattern})`);
  }
}

if (problems.length > 0) {
  console.error('\nCommit rejected by pre-commit checks:');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}
