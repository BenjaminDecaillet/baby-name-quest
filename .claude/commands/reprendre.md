Reprends le projet Baby Name Quest sans repartir de zéro.

1. Lis `PROGRESS.md` en entier (OS détecté, décisions figées, plan, journal).
2. Vérifie l'état git : `git status`, `git branch --show-current` (attendu : `feat/baby-name-shortlist-app`),
   `git log --oneline -5`. Si le working tree est sale, comprends pourquoi avant toute chose et
   termine ou nettoie l'incrément en cours.
3. Vérifie que `npm install` a été fait (`node_modules` présent) ; sinon lance-le.
4. Exécute exactement ce qui est décrit dans la section « PROCHAINE ACTION » de `PROGRESS.md`.
5. Respecte `CLAUDE.md` (Angular, aucune mention d'IA, UTF-8 sans BOM, LF, Windows/PowerShell).
6. Après chaque incrément : `/checkpoint`.
