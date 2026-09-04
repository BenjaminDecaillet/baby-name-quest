Sauvegarde l'état du projet : PROGRESS.md, puis commit, puis push.

1. Mets à jour `PROGRESS.md` : statut des chantiers (`[x]` avec le commit), section « PROCHAINE ACTION »
   réécrite pour être exécutable sans contexte, section « BLOQUÉ » à jour, ligne de journal datée.
2. `git add -A` puis `git status` : vérifie qu'aucun secret ni fichier indésirable n'est inclus.
3. Commit en convention Angular (`type(scope): description à l'impératif`), sans aucun trailer
   ni mention d'IA. Un commit par changement cohérent : sépare si nécessaire.
4. `git push -u origin feat/baby-name-shortlist-app` (réessaie avec backoff 2s/4s/8s/16s si erreur réseau).
5. Confirme en une ligne : hash du commit et prochaine action.
