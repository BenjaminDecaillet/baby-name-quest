# Configurer Supabase

Sans Supabase, le site fonctionne en mode local (tout reste dans le navigateur). Pour que deux
téléphones partagent leurs shortlists en temps réel, il faut un projet Supabase (offre gratuite).

## 1. Créer le projet
1. https://supabase.com → **New project** (n'importe quelle région proche, mot de passe base de
   données à conserver mais inutile pour le site).
2. Attendre que le projet soit prêt (une à deux minutes).

## 2. Créer le schéma
1. Menu **SQL Editor** → **New query**.
2. Coller l'intégralité de [`supabase/schema.sql`](../supabase/schema.sql) et exécuter (**Run**).
3. Vérifier dans **Table Editor** la présence de `couples`, `profiles`, `votes` avec RLS activée.

Le script est idempotent : il peut être rejoué sans risque.

## 3. Récupérer les clés
Menu **Project Settings** (roue crantée) → **API** :
- **Project URL** → `VITE_SUPABASE_URL` (ex. `https://abcdefgh.supabase.co`)
- **Project API keys → `anon` `public`** → `VITE_SUPABASE_ANON_KEY`

La clé `service_role` ne doit **jamais** être utilisée ni copiée dans le site.

## 4. Configurer le site
### En local
Copier `.env.example` en `.env` (fichier ignoré par git) et renseigner les deux valeurs.
`npm run dev` redémarre avec Supabase actif ; la page « Mon profil » affiche
« synchronisés entre vos appareils ».

### Pour le déploiement GitHub Pages
Deux secrets GitHub Actions nommés `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
Deux options :
- via l'interface : **Settings → Secrets and variables → Actions → New repository secret** ;
- via le script fourni, avec le token GitHub stocké hors dépôt dans
  `%USERPROFILE%\.bnq\github-token` (ou `~/.bnq/github-token`) et les valeurs dans `.env` :

```powershell
npm run secrets:github
```

Le prochain push (ou **Actions → CI → Run workflow**) rebuild le site avec la synchronisation.

## 5. Vérifier le temps réel
Le site utilise un canal *broadcast* Supabase Realtime nommé d'après le code de couple ; aucune
configuration supplémentaire n'est nécessaire (Realtime est activé par défaut). Ouvrir le site sur
deux appareils avec le même code : un « j'aime » d'un côté apparaît de l'autre sans recharger.
