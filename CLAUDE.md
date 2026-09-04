# Baby Name Quest — conventions du dépôt

**Au démarrage d'une session : lire `PROGRESS.md` et repartir de la section « PROCHAINE ACTION ».**
La commande `/reprendre` fait exactement cela.

## Objectif
Site web en français (mobile-first) pour parcourir des milliers de prénoms (INSEE + OFS),
constituer chacun sa shortlist et voir celle de l'autre ainsi que les coups de cœur communs.

## Stack et architecture (10 lignes)
- Vite + React 19 + TypeScript strict + Tailwind CSS 4 ; tests Vitest + Testing Library.
- `public/data/names.json` : dataset statique généré par `scripts/build-names.ts` (INSEE + OFS).
- `src/data/` : chargement et typage du dataset, filtres, tri, matching.
- `src/storage/` : interface `StorageAdapter` + `LocalStorageAdapter` (repli) + `SupabaseAdapter`,
  choisi à l'exécution selon `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- `src/features/onboarding|swipe|list|matches` : les écrans ; `src/components/` : UI partagée.
- `src/store/` : état applicatif (profil courant, votes, préférences) exposé par hooks.
- `supabase/schema.sql` : tables `couples`, `profiles`, `votes` + RLS.
- `.github/workflows/` : lint, typecheck, tests, build puis déploiement GitHub Pages.
- Base Vite = `/baby-name-quest/` en production (variable `VITE_BASE_PATH`).

## Commandes
`npm run dev` · `npm run build` · `npm run test` · `npm run lint` · `npm run typecheck`
`npm run verify` (tout enchaîné) · `npm run build:names` (régénère le dataset) · `npm run check:repo`

## Règles non négociables
1. **Aucune mention d'IA, d'assistant ou d'outil de génération** dans le dépôt : ni commits,
   ni branches, ni PR, ni commentaires, ni docs. Aucun trailer `Co-Authored-By`, aucun
   `Generated with`, aucun identifiant de session. Le hook `commit-msg` le refuse.
2. **Commits en convention Angular** : `type(scope): description à l'impératif`.
   Types : feat, fix, docs, style, refactor, perf, test, build, ci, chore. Un commit = un changement.
3. **Branche de travail unique** : `feat/baby-name-shortlist-app` (depuis `main`).
   Push continu, PR unique à la fin, titre Angular, description en français.
4. **Langues** : code, identifiants, commits, fichiers → anglais. README, docs/, PR → français.
   Interface → 100 % français, naturel.
5. **Jamais de secret commité.** `.env` ignoré, `.env.example` versionné.
   Le token GitHub vit hors dépôt : `%USERPROFILE%\.bnq\github-token` (Windows) ou
   `~/.bnq/github-token` (Linux). Ne jamais l'afficher, le logger ni l'écrire dans un fichier suivi.

## Contraintes Windows / encodage
- Machine du propriétaire : Windows + PowerShell. Pas de `chmod`, `rm -rf`, `touch`, `cat >`,
  ni `&&` dans le terminal ; utiliser `;` ou des commandes séparées.
- Tous les fichiers en **UTF-8 sans BOM**, fins de ligne **LF** (`.gitattributes`, `.editorconfig`).
  Ne jamais créer un fichier via `>` ou `Set-Content` sans `-Encoding utf8` ; préférer les outils d'édition.
- Scripts d'aide en Node/TypeScript (`scripts/*.ts` via `tsx`), jamais en `.sh`.
  Dans `package.json` : `rimraf`, `cross-env`, `node:path`, pas de commande Unix.
- Hooks git via husky, chacun appelant un script Node (`scripts/hooks/*.mjs`).

## Discipline de session
- Ne jamais terminer un tour avec un working tree sale : ce qui est fait est commité et poussé.
- Après chaque incrément : mettre à jour `PROGRESS.md`, commit, push — dans cet ordre.
- Petit incrément livré > gros incrément à moitié fait. Le site reste déployable à chaque commit.
- Déléguer les gros travaux exploratoires à des sous-agents avec un périmètre de fichiers explicite ;
  seul l'agent principal commite. Aucun sous-agent ne manipule le token GitHub.
