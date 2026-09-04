// Husky commit-msg hook: enforce the Angular commit convention and reject
// forbidden wording. Runs on Node so it works identically in PowerShell,
// cmd, Git Bash and Linux shells.
import { readFileSync } from 'node:fs';

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const HEADER = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9][a-z0-9-]*\\))?!?: [^\\s].{2,}$`);
const FORBIDDEN = [/claude/i, /co-authored-by/i, /generated with/i, /anthropic/i];

const file = process.argv[2];
if (!file) {
  console.error('commit-msg hook: missing message file argument');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');
const lines = raw.split(/\r?\n/).filter((line) => !line.startsWith('#'));
const header = lines.find((line) => line.trim().length > 0) ?? '';

const errors = [];
if (!HEADER.test(header)) {
  errors.push(
    `header "${header}" does not follow "type(scope): imperative description"\n` +
      `  allowed types: ${TYPES.join(', ')}`,
  );
}
if (header.length > 100) errors.push('header longer than 100 characters');
for (const pattern of FORBIDDEN) {
  if (pattern.test(raw)) errors.push(`message contains forbidden wording (${pattern})`);
}

if (errors.length > 0) {
  console.error('\nCommit rejected:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('');
  process.exit(1);
}
