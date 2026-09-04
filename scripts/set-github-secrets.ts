// Creates or updates the GitHub Actions secrets used by the deployment
// workflow (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) through the GitHub
// REST API. Values are sealed with the repository public key (libsodium
// sealed box) and are never printed.
//
// Inputs (never stored in the repository):
//   - GitHub token: file ~/.bnq/github-token (or %USERPROFILE%\.bnq\github-token),
//     or environment variable GITHUB_TOKEN.
//   - Secret values: environment variables VITE_SUPABASE_URL and
//     VITE_SUPABASE_ANON_KEY, or a local `.env` file (ignored by git).
//
// Usage: npm run secrets:github
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import sodium from 'libsodium-wrappers';

const OWNER = process.env.GITHUB_OWNER ?? 'BenjaminDecaillet';
const REPO = process.env.GITHUB_REPO ?? 'baby-name-quest';
const SECRET_NAMES = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

function readToken(): string {
  const fromEnv = process.env.GITHUB_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const file = path.join(homedir(), '.bnq', 'github-token');
  if (!existsSync(file)) {
    throw new Error(`GitHub token not found: set GITHUB_TOKEN or create ${file}`);
  }
  return readFileSync(file, 'utf8').trim();
}

function readDotEnv(): Record<string, string> {
  const file = path.join(process.cwd(), '.env');
  if (!existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

async function api<T>(token: string, method: string, route: string, body?: unknown): Promise<T> {
  const response = await fetch(`https://api.github.com${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`${method} ${route} failed: ${response.status} ${response.statusText}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

async function main(): Promise<void> {
  const token = readToken();
  const dotEnv = readDotEnv();
  const values = SECRET_NAMES.map((name) => {
    const value = process.env[name]?.trim() || dotEnv[name]?.trim();
    if (!value) throw new Error(`Missing value for ${name} (environment or .env)`);
    return { name, value };
  });

  await sodium.ready;
  const key = await api<{ key_id: string; key: string }>(
    token,
    'GET',
    `/repos/${OWNER}/${REPO}/actions/secrets/public-key`,
  );
  const publicKey = sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL);

  for (const { name, value } of values) {
    const sealed = sodium.crypto_box_seal(sodium.from_string(value), publicKey);
    const encrypted_value = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
    await api(token, 'PUT', `/repos/${OWNER}/${REPO}/actions/secrets/${name}`, {
      encrypted_value,
      key_id: key.key_id,
    });
    console.log(`secret ${name}: updated`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
