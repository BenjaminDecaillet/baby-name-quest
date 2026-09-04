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
| 10 | Supabase : schéma + RLS + adapter vérifiés contre le vrai projet ; broadcast temps réel à confirmer à deux | [x] fait | 5c9fc01 |
| 11 | CI GitHub Actions (verify + déploiement Pages, `enablement: true`) | [x] fait | 52d3a9b |
| 12 | Polish mobile, accessibilité, README FR (installation Windows) | [x] fait | 2db072c, 6cf39d8 |
| 13 | PR fusionnées (#1, #2, #3) ; Pages activé ; secrets Supabase en place ; site déployé avec synchronisation | [x] fait | 22e8329 |

## PROCHAINE ACTION
Projet livré. Prochain incrément éventuel (à décider par Benjamin) : retours d'usage après un test
réel à deux téléphones avec le même code de couple (temps réel, ergonomie). Toute reprise repart
de `main` : `git checkout -B feat/baby-name-shortlist-app origin/main`, puis PR à la fin.

## BLOQUÉ / EN ATTENTE DE BENJAMIN
- Rien. Le token GitHub reste inutile tant que Pages et les secrets existent.

## Journal
- 2026-09-04 — Démarrage. Repo vide. Socle en cours (hygiène, hooks, commandes, skills, scaffold).
  Sous-agent lancé sur le pipeline de données.
- 2026-09-04 — Livré : socle, hooks, scaffold, dataset INSEE+OFS (22 870 prénoms), couche données,
  stockage local + Supabase, store, onboarding, layout, CI Pages. Reste : intégrer swipe/liste/matchs,
  README, polish, PR.
- 2026-09-04 — Livré : swipe, liste + filtres, matchs + classement (tests : 96 verts). Reste : vérification
  déploiement, polish, PR.
- 2026-09-04 — Polish mobile (swipe plein écran, défilement dans `main`, onglets), parcours complet
  vérifié dans Chromium en viewport iPhone (aucune erreur console). PR ouverte. En attente :
  activation Pages (token) et clés Supabase.
- 2026-09-04 — GitHub Pages activé par Benjamin ; run 12 déployé, site en ligne
  (https://benjamindecaillet.github.io/baby-name-quest/, dataset et liens profonds vérifiés).
  Reste : secrets Supabase puis test de synchronisation.
- 2026-09-04 — Secrets Supabase créés par Benjamin (vérifiés présents dans le build, run 18). Le
  déploiement depuis la branche de travail est refusé par la protection d'environnement ; workflow
  ajusté pour ne déployer que depuis `main`.
- 2026-09-04 — PR #3 fusionnée ; site en ligne reconstruit avec Supabase (bundle vérifié). Test de
  bout en bout contre le projet Supabase avec la clé anon publique : création couple/profil/vote,
  lecture, isolation RLS entre codes (0 ligne, écriture refusée), nettoyage. Non testé d'ici : le
  canal temps réel entre deux navigateurs (repli : rechargement au retour sur l'onglet).
