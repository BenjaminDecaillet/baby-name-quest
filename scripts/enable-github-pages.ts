// Enables GitHub Pages (source: GitHub Actions) on the repository through the
// REST API. Idempotent: does nothing when Pages is already configured.
// Token: ~/.bnq/github-token (or %USERPROFILE%\.bnq\github-token) or GITHUB_TOKEN.
// Usage: npx tsx scripts/enable-github-pages.ts
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const OWNER = process.env.GITHUB_OWNER ?? 'BenjaminDecaillet';
const REPO = process.env.GITHUB_REPO ?? 'baby-name-quest';

function readToken(): string {
  const fromEnv = process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const file = path.join(homedir(), '.bnq', 'github-token');
  if (!existsSync(file))
    throw new Error(`GitHub token not found: set GITHUB_TOKEN or create ${file}`);
  return readFileSync(file, 'utf8').trim();
}

async function main(): Promise<void> {
  const token = readToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
  const route = `https://api.github.com/repos/${OWNER}/${REPO}/pages`;
  const current = await fetch(route, { headers });
  if (current.ok) {
    const info = (await current.json()) as { html_url?: string; build_type?: string };
    if (info.build_type === 'workflow') {
      console.log(`GitHub Pages already enabled: ${info.html_url ?? ''}`);
      return;
    }
    const updated = await fetch(route, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ build_type: 'workflow' }),
    });
    if (!updated.ok) throw new Error(`PUT pages failed: ${updated.status}`);
    console.log('GitHub Pages switched to GitHub Actions source');
    return;
  }
  if (current.status !== 404) throw new Error(`GET pages failed: ${current.status}`);
  const created = await fetch(route, {
    method: 'POST',
    headers,
    body: JSON.stringify({ build_type: 'workflow' }),
  });
  if (!created.ok) throw new Error(`POST pages failed: ${created.status}`);
  const info = (await created.json()) as { html_url?: string };
  console.log(`GitHub Pages enabled: ${info.html_url ?? ''}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
