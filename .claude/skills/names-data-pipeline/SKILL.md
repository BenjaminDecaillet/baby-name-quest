---
name: names-data-pipeline
description: Pipeline de données prénoms (INSEE + OFS) — comment régénérer public/data/names.json, schéma, règles de fusion, dédoublonnage, tendance et encodage. À charger pour toute modification de scripts/build-names.ts ou du dataset.
---

# Pipeline de données prénoms

## Commande
`npm run build:names` → exécute `scripts/build-names.ts` avec `tsx` (Node ≥ 20, aucun outil Unix).
Les sources téléchargées sont mises en cache dans `data/cache/` (ignoré par git).
Le résultat est versionné : `public/data/names.json` (compact) + `public/data/names.meta.json`.

## Sources officielles
- INSEE, « Fichier des prénoms » national (`nat<année>_csv.zip`, colonnes `sexe;preusuel;annais;nombre`).
  Lignes `_PRENOMS_RARES` et années `XXXX` ignorées. Encodage à détecter (Latin-1 ou UTF-8) et
  convertir explicitement en UTF-8.
- OFS/BFS Suisse, « Prénoms des nouveau-nés », fichiers par sexe et par année.
Voir `docs/donnees.md` pour les URL exactes et les licences.

## Schéma d'un prénom
`id`, `name`, `gender` (`f`|`m`|`x`), `countFR`, `countCH`, `recentFR`, `recentCH`,
`popularityRank`, `trend` (`up`|`stable`|`down`), `firstLetter` (sans accent), `length`, `origin?`, `meaning?`.

## Règles
- Fusion insensible à la casse, accents conservés (« Zoé » ≠ « Zoe »).
- Forme d'affichage : majuscule initiale de chaque partie (« Jean-Pierre »).
- `gender = x` si le sexe minoritaire représente ≥ 20 % des naissances cumulées.
- Popularité : score récent (5 dernières années) pondéré pour que la Suisse ne soit pas noyée.
- Tendance : moyenne des 3 dernières années vs 10 ans plus tôt ; ±25 % → `up`/`down`, sinon `stable`.
- Origine : table curatée `data/origins.json` (clé = prénom en minuscules, accents conservés).
- Signification : table curatée `data/meanings.json`, même format et mêmes clés que les origines ;
  valeur courte en français (≤ 80 caractères, sans point final), origine et signification restent
  cohérentes entre elles.

## Vérifications après régénération
- « Zoé », « Loïc », « Anaïs », « Noé » intacts ; « Luca » avec `countCH > 0`.
- Taille du JSON < 4 Mo ; `npm run test` (tests du chargeur et des filtres) vert.
