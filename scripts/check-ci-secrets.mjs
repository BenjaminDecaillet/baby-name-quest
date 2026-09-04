// CI helper: reports whether the Supabase secrets reached the build job,
// without ever printing their values. Missing secrets are not an error
// (the site then runs in local-storage mode) but they are made visible.
const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missing = names.filter((name) => !process.env[name]?.trim());

if (missing.length === 0) {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  const looksValid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url);
  console.log(
    `::notice::Supabase secrets present (URL ${looksValid ? 'has the expected shape' : 'has an unexpected shape'}). Build with synchronisation.`,
  );
  if (!looksValid)
    console.log('::warning::VITE_SUPABASE_URL should look like https://<ref>.supabase.co');
} else {
  console.log(
    `::warning::Missing repository secrets: ${missing.join(', ')}. The site will run in local mode. ` +
      'Create them under Settings > Secrets and variables > Actions (repository secrets, not environment secrets).',
  );
}
