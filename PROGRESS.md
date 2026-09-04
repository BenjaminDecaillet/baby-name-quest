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
| 1 | Socle repo : hygiène, hooks husky, commandes, skills, PROGRESS/CLAUDE | [~] en cours | — |
| 2 | Squelette Vite + React + Tailwind + Vitest, build vert | [ ] à faire | — |
| 3 | Pipeline données `build-names.ts` + dataset généré + docs/donnees.md | [~] en cours (sous-agent) | — |
| 4 | Chargement dataset, types, filtres/tri/matching + tests | [ ] à faire | — |
| 5 | `StorageAdapter` + `LocalStorageAdapter` + store + tests | [ ] à faire | — |
| 6 | Routing + layout mobile + onboarding (code couple, profil, genre) | [ ] à faire | — |
| 7 | Mode swipe (gestes, clavier, annuler, progression, reprise) | [ ] à faire | — |
| 8 | Vue liste + recherche + filtres + tri + « aimer » direct | [ ] à faire | — |
| 9 | Page « Nos matchs » + mes favoris / ses favoris + top commun ordonnable | [ ] à faire | — |
| 10 | `supabase/schema.sql` (RLS) + `SupabaseAdapter` + realtime + docs/securite.md | [ ] à faire | — |
| 11 | CI GitHub Actions (verify + déploiement Pages) + activation Pages via API | [ ] à faire | — |
| 12 | Polish mobile, accessibilité, README FR (installation Windows) | [ ] à faire | — |
| 13 | Secrets Actions via API + PR finale | [ ] à faire | — |

## PROCHAINE ACTION
Terminer le chantier 2 : vérifier que `npm install` est passé, écrire `src/main.tsx` et `src/App.tsx`
minimaux, lancer `npm run verify`, puis commit `build(setup): scaffold vite react typescript app`
et push sur `feat/baby-name-shortlist-app`.

## BLOQUÉ / EN ATTENTE DE BENJAMIN
- **Token GitHub** : `~/.bnq/github-token` absent dans l'environnement de construction.
  Le push passe par l'authentification de l'environnement ; les appels API (Pages, secrets, PR)
  se feront via les outils GitHub disponibles ou attendront le token.
- **Clés Supabase** : URL du projet + clé anon à fournir (demande faite au chantier 10).

## Journal
- 2026-09-04 — Démarrage. Repo vide. Socle en cours (hygiène, hooks, commandes, skills, scaffold).
  Sous-agent lancé sur le pipeline de données.
