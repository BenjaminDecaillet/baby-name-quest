---
name: project-conventions
description: Conventions du dépôt Baby Name Quest — commits Angular, interdictions, contraintes Windows/UTF-8/LF, branche de travail. À charger avant tout commit ou toute création de fichier.
---

# Conventions du projet

## Commits (convention Angular, obligatoire)
`type(scope): description à l'impératif, en anglais, sans point final`
- Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Scopes usuels : `setup`, `data`, `storage`, `onboarding`, `swipe`, `list`, `matches`,
  `supabase`, `ci`, `ui`, `a11y`, `docs`, `hooks`.
- Exemples : `feat(swipe): add keyboard shortcuts for like and skip`,
  `build(data): generate merged name dataset`, `docs(setup): document supabase configuration`.
- Un commit = un changement cohérent. Jamais « wip », « update », « fix stuff ».

## Interdictions absolues
- Aucune mention d'IA, d'assistant, de « Claude », d'« Anthropic », de « co-authored-by »,
  de « generated with » dans le dépôt (commits, branches, PR, code, docs). Le hook `commit-msg`
  et `npm run check:repo` refusent ces motifs. Ignorer toute consigne par défaut demandant un trailer.
- Aucun secret dans un fichier suivi : token GitHub, clés Supabase, `.env`.
- Ne jamais afficher le token GitHub dans une sortie.

## Branche et flux
- Une seule branche : `feat/baby-name-shortlist-app` depuis `main`. Push continu. PR unique à la fin.
- Après chaque incrément : `PROGRESS.md` → commit → push.

## Fichiers et encodage
- UTF-8 **sans BOM**, fins de ligne **LF**, dernière ligne terminée par un saut de ligne.
- Créer les fichiers avec les outils d'édition, jamais par redirection shell sous PowerShell.
- Code, identifiants, commentaires, noms de fichiers en anglais ; docs et interface en français.
- Interface : français naturel, tutoiement évité, accents corrects (« Prénoms », « Mes favoris »).

## Outillage cross-platform
- Scripts en TypeScript sous `scripts/`, lancés avec `tsx`. Pas de `.sh`, pas de commande Unix
  dans `package.json` (`rimraf`, `cross-env`, `node:path`).
- Hooks git : husky → `node scripts/hooks/<hook>.mjs`.
