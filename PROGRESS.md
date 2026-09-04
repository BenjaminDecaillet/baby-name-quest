# PROGRESS — Baby Name Quest

> Source de vérité de l'état du projet. Une nouvelle session lit ce fichier puis exécute
> la section « PROCHAINE ACTION ». Mise à jour après chaque incrément, avant commit + push.

## Environnement
- **OS détecté (session de construction)** : conteneur Linux distant (x86_64), shell POSIX.
  Les commandes ci-dessous sont données en équivalent POSIX ; sur la machine du propriétaire
  (Windows + PowerShell) utiliser `;` au lieu de `&&` et les outils d'édition pour créer des fichiers.
- Node v22 (≥ 20 requis), npm 10.
- Token GitHub : attendu dans `~/.bnq/github-token` (Linux) ou `%USERPROFILE%\.bnq\github-token`
  (Windows). **Absent dans le conteneur de construction** → voir section BLOQUÉ.

## Objectif (3 lignes)
Site web en français, mobile-first, pour parcourir des milliers de prénoms (INSEE + OFS Suisse),
constituer chacun sa shortlist (swipe ou liste filtrée), voir celle de l'autre et les coups de cœur
communs, synchronisés entre deux appareils via un simple code de couple.

## Décisions figées
- Stack : Vite + React 19 + TypeScript + Tailwind CSS 4 ; Vitest ; GitHub Pages via Actions.
- Données : fusion INSEE (fichier des prénoms) + OFS (prénoms des nouveau-nés), JSON statique
  généré par `scripts/build-names.ts`, versionné dans `public/data/`.
- Identification : code de couple + prénom d'utilisateur + genre recherché ; mémorisé sur l'appareil.
- Synchronisation : interface `StorageAdapter` → `LocalStorageAdapter` (repli) / `SupabaseAdapter`
  (si `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), realtime Supabase, RLS par code de couple.
- Branche unique `feat/baby-name-shortlist-app` depuis `main` ; commits Angular ; aucune mention d'IA.

## Plan de chantiers (incréments de 30–45 min)
| # | Chantier | Statut | Commit |
|---|----------|--------|--------|
| 1 | Socle repo : hygiène, hooks husky, commandes, skills, PROGRESS.md et conventions | [x] fait | 463e292 |
| 2 | Squelette Vite + React + Tailwind + Vitest, build vert | [x] fait | 5ff1bb3 |
| 3 | Pipeline données `build-names.ts` + dataset généré + docs/donnees.md | [x] fait | 18230ba |
| 4 | Chargement dataset, types, filtres/tri + tests | [x] fait | 531fbe7 |
| 5 | `StorageAdapter` + `LocalStorageAdapter` + `SupabaseAdapter` + schema.sql + docs/securite.md | [x] fait | 5c9fc01 |
| 6 | Store de session + onboarding (code couple, profil, genre) + layout + navigation | [x] fait | f4d62fc, 7dd231b |
| 7 | Mode swipe (gestes, clavier, annuler, progression, reprise) | [x] fait | 605fb77 |
| 8 | Vue liste + recherche + filtres + tri + « aimer » direct | [x] fait | 6046274 |
| 9 | Page « Nos matchs » + mes favoris / ses favoris + top commun ordonnable | [x] fait | 9709520 |
| 10 | Realtime Supabase (broadcast) + branchement runtime — fait dans l'adapter ; reste : tester avec de vraies clés | [~] en attente des clés | 5c9fc01 |
| 11 | CI GitHub Actions (verify + déploiement Pages, `enablement: true`) | [x] fait | 52d3a9b |
| 12 | Polish mobile, accessibilité, README FR (installation Windows) | [ ] à faire | — |
| 13 | Secrets Actions + activation Pages via API + PR finale | [ ] à faire (token absent, scripts prêts) | — |

## PROCHAINE ACTION
Chantier 12 : vérifier le déploiement Pages (Actions → dernier run vert, URL
https://benjamindecaillet.github.io/baby-name-quest/), tester le parcours complet sur le build
(`npm run build` puis `npm run preview`), corriger les défauts mobile/a11y trouvés, puis ouvrir la PR
(chantier 13) avec le titre `feat: build baby name shortlist app` et une description en français.

## BLOQUÉ / EN ATTENTE DE BENJAMIN
- **Token GitHub** : `~/.bnq/github-token` absent dans l'environnement de construction, et l'API
  GitHub n'est pas joignable directement depuis ce conteneur. Le push git fonctionne.
  Scripts prêts à lancer localement : `npm run pages:enable` (active Pages, source Actions) et
  `npm run secrets:github` (crée les secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
  Le workflow tente aussi d'activer Pages tout seul (`actions/configure-pages` avec `enablement: true`).
- **Clés Supabase** : URL du projet + clé anon à fournir (Dashboard Supabase → Project Settings →
  API → « Project URL » et « anon public »). Puis exécuter `supabase/schema.sql` dans SQL Editor.

## Journal
- 2026-09-04 — Démarrage. Repo vide. Socle en cours (hygiène, hooks, commandes, skills, scaffold).
  Sous-agent lancé sur le pipeline de données.
- 2026-09-04 — Livré : socle, hooks, scaffold, dataset INSEE+OFS (22 870 prénoms), couche données,
  stockage local + Supabase, store, onboarding, layout, CI Pages. Reste : intégrer swipe/liste/matchs,
  README, polish, PR.
- 2026-09-04 — Livré : swipe, liste + filtres, matchs + classement (tests : 96 verts). Reste : vérification
  déploiement, polish, PR.
