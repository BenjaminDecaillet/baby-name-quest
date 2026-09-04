Vérifie que le projet est sain avant de commiter.

Exécute dans l'ordre et corrige ce qui échoue :
1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run check:repo` (UTF-8 sans BOM, LF, aucun secret, aucune mention interdite)

Résume en quelques lignes : ce qui passe, ce qui a été corrigé, ce qui reste.
