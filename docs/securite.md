# Sécurité et confidentialité

## Modèle
L'application n'a ni mot de passe ni adresse e-mail. Un **code de couple** (ex. `DECAILLET-2026`)
relie les deux profils. Il est saisi une fois par appareil, mémorisé localement, et envoyé
à chaque requête Supabase dans l'en-tête HTTP `x-couple-code`.

## Ce qui est public
- La **clé anon Supabase** et l'URL du projet sont embarquées dans le site déployé : elles sont
  publiques par nature, comme pour toute application front Supabase.
- Le code source du site est public sur GitHub.

## Ce qui protège réellement les données
- **RLS (Row Level Security)** activée sur les trois tables (`couples`, `profiles`, `votes`).
- Les policies ne renvoient et n'acceptent que les lignes dont `couple_code` est égal au code
  transmis dans l'en-tête. Sans le bon code : zéro ligne, en lecture comme en écriture.
- Il n'existe aucune requête permettant de lister les codes existants.
- Un trigger empêche d'associer un vote à un profil d'un autre couple.

## Limites assumées
- La sécurité repose sur le **secret du code de couple**. Quelqu'un qui le connaît peut lire
  et modifier les shortlists. C'est acceptable pour l'usage prévu : un couple, des prénoms.
- Choisir un code difficile à deviner (nom + année + mot personnel, par exemple).
- Le canal temps réel est un canal *broadcast* nommé d'après le code ; il ne transporte
  aucune donnée, seulement un signal « quelque chose a changé » qui déclenche un rechargement.
- Le mode de repli (sans Supabase) garde tout dans le navigateur : rien ne quitte l'appareil.

## Secrets côté dépôt
- Aucun secret n'est versionné : `.env` est ignoré, `.env.example` sert de modèle.
- Les clés Supabase de production sont des **secrets GitHub Actions**
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) injectés au build.
- Les hooks git refusent tout fichier contenant un motif de token.
