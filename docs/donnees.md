# Données : le jeu de prénoms

Le jeu de données de l'application est un fichier statique, `public/data/names.json`, accompagné de
`public/data/names.meta.json` (sources, date de génération, règles appliquées, compteurs). Les deux fichiers
sont produits par le script `scripts/build-names.ts` à partir de deux sources officielles.

## Sources

### INSEE – Fichier des prénoms (France)

- Page : <https://www.insee.fr/fr/statistiques/8595130> (édition 2025, naissances de 1900 à 2025).
- Fichier utilisé : `prenoms-2025-nat_csv.zip` (fichier national), colonnes `sexe;prenom;periode;valeur;rang`.
  Les éditions antérieures (`sexe;preusuel;annais;nombre`) sont également reconnues par le script.
- Licence : [Licence Ouverte / Open Licence 2.0 (Etalab)](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).
  La réutilisation est libre à condition de mentionner la source (« Source : Insee, Fichier des prénoms »).
- Particularités : depuis l'édition de juillet 2025, l'INSEE arrondit chaque effectif au multiple de 5 le plus proche
  (un prénom donné moins de 3 fois dans l'année n'apparaît donc pas). La ligne agrégée `_PRENOMS_RARES` et les
  années inconnues (`XXXX`) sont ignorées. Les prénoms sont fournis en majuscules accentuées.

### OFS/BFS – Prénoms des nouveau-nés (Suisse)

- Page : <https://www.bfs.admin.ch/bfs/fr/home/statistiques/population/naissances-deces/prenoms-nouveaux-nes.html>
  (statistique BEVNAT, naissances de 2000 à 2025).
- Données : API SDMX de l'OFS (stats.swiss), flux `DF_BEVNAT_PRENOMS_1` (garçons) et `DF_BEVNAT_PRENOMS_2` (filles),
  clé `8100..A.COUNT` (Suisse entière, tous les prénoms, fréquence annuelle, unité « nombre »), export CSV :
  - <https://disseminate.stats.swiss/rest/data/CH1.BEVNAT,DF_BEVNAT_PRENOMS_1,1.0.0/8100..A.COUNT?format=csvfilewithlabels&dimensionAtObservation=AllDimensions>
  - <https://disseminate.stats.swiss/rest/data/CH1.BEVNAT,DF_BEVNAT_PRENOMS_2,1.0.0/8100..A.COUNT?format=csvfilewithlabels&dimensionAtObservation=AllDimensions>
- Licence : conditions d'utilisation OFS **OPEN-BY** (utilisation libre, indication de la source obligatoire :
  « Source : OFS – Statistique du mouvement naturel de la population (BEVNAT) »).
- Particularités : l'OFS ne publie que les prénoms les plus donnés aux nouveau-nés (environ 2 700 prénoms par sexe) ;
  les prénoms plus rares n'ont donc pas d'effectif suisse (`countCH = 0`). L'API exige un en-tête `Accept-Language`
  explicite (le script envoie `fr`).

## Régénérer les fichiers

```sh
npm run build:names          # équivalent à : npx tsx scripts/build-names.ts
npm run build:names -- --refresh   # ignore le cache et retélécharge les sources
```

Le script est écrit en TypeScript pur (Node ≥ 18, aucun outil système requis : lecture des ZIP avec `node:zlib`,
détection explicite de l'encodage UTF-8 / ISO-8859-1). Les fichiers téléchargés sont conservés dans `data/cache/`
(ignoré par git) ; les sorties sont écrites en UTF-8 sans BOM avec des fins de ligne LF.

Option `--max-bytes=<n>` : budget de taille de `names.json` (4 000 000 octets par défaut). Si le fichier dépasse
ce budget, les prénoms les moins fréquents (effectif total le plus faible) sont retirés jusqu'à ce qu'il tienne ;
le seuil réellement appliqué est écrit dans `names.meta.json` (`rules.minTotalCount`).

## Schéma de `names.json`

Tableau JSON compact (sans indentation) d'objets triés par `popularityRank` :

| Champ            | Type                         | Description                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`                     | Identifiant unique en minuscules sans accent, suffixé du genre (`zoe-f`, `jean-pierre-m`). En cas d'homographe sans accent (« Zoé » / « Zoe »), le prénom le plus fréquent garde l'identifiant simple, l'autre reçoit un suffixe numérique (`zoe-f-2`). |
| `name`           | `string`                     | Forme d'affichage : initiale de chaque partie en majuscule, reste en minuscules, accents conservés (`Zoé`, `Jean-Pierre`, `N'Guessan`).                                                                                                                 |
| `gender`         | `"f" \| "m" \| "x"`          | `x` (mixte) lorsque le sexe minoritaire représente au moins 20 % des naissances (France + Suisse, toutes années).                                                                                                                                       |
| `countFR`        | `number`                     | Naissances en France sur toute la période disponible (1900-2025).                                                                                                                                                                                       |
| `countCH`        | `number`                     | Naissances en Suisse sur toute la période disponible (2000-2025).                                                                                                                                                                                       |
| `recentFR`       | `number`                     | Naissances en France sur les 5 dernières années disponibles (2021-2025).                                                                                                                                                                                |
| `recentCH`       | `number`                     | Naissances en Suisse sur les 5 dernières années disponibles.                                                                                                                                                                                            |
| `popularityRank` | `number`                     | Rang de popularité, 1 = le plus donné (voir ci-dessous).                                                                                                                                                                                                |
| `trend`          | `"up" \| "stable" \| "down"` | Tendance sur dix ans (voir ci-dessous).                                                                                                                                                                                                                 |
| `firstLetter`    | `string`                     | Première lettre en majuscule sans accent (`É` → `E`).                                                                                                                                                                                                   |
| `length`         | `number`                     | Nombre de lettres, sans tirets, espaces ni apostrophes.                                                                                                                                                                                                 |
| `origin`         | `string` (optionnel)         | Origine étymologique en français (`hébraïque`, `latin`, `grec`, `germanique`, `arabe`, `breton`, …) issue de la table `data/origins.json`.                                                                                                              |
| `meaning`        | `string` (optionnel)         | Signification du prénom en français, courte (`force de Dieu`, `diminutif d'Anne, « pleine de grâce »`), issue de la table `data/meanings.json`.                                                                                                         |

`names.meta.json` contient : `generatedAt`, `total`, `lastYear`, `recentYears`, la liste `sources`
(`name`, `url`, `licence`, `years`, URL de téléchargement, encodage détecté, nombre de lignes), les `rules`
appliquées, les `counts` (par genre, avec données suisses, avec origine, avec signification) et `sizeBytes`.

## Règles de construction

### Normalisation et dédoublonnage

1. Chaque prénom est mis en forme d'affichage (`toDisplayName`) : parties séparées par un tiret, un espace ou une
   apostrophe, initiale en majuscule, reste en minuscules. Après une apostrophe, la partie suivante n'est capitalisée
   que si la partie précédente est une lettre unique (`N'Guessan`, mais `Abd'allah`, `Arc'hantael`).
2. Les entrées qui ne diffèrent que par la casse sont fusionnées (clé : forme d'affichage en minuscules,
   normalisation Unicode NFC). Les accents sont conservés : « Zoé » et « Zoe » restent deux prénoms distincts.
3. Les effectifs français et suisses d'un même prénom, quel que soit le sexe déclaré, sont additionnés ; les
   effectifs par sexe servent à déterminer `gender`.
4. Sont écartés : les prénoms de moins de 2 lettres, et ceux dont l'effectif total (France + Suisse, toutes années)
   est inférieur à 3. Le budget de taille peut ensuite relever ce seuil (valeur effective dans `names.meta.json`).
5. `origin` et `meaning` sont recherchées dans `data/origins.json` et `data/meanings.json` de manière insensible à la
   casse (accents conservés). Une valeur vide dans une table est ignorée.

### Popularité

Score de popularité : `recentFR + 8 × recentCH` sur les 5 dernières années disponibles. La France enregistre
environ huit fois plus de naissances par an que la Suisse (≈ 650 000 contre ≈ 80 000) ; la pondération met les deux
pays sur un pied d'égalité par habitant, sans quoi les prénoms typiquement suisses seraient noyés. Les ex æquo sont
départagés par l'effectif total puis par ordre alphabétique.

### Tendance

- Fenêtre récente : moyenne annuelle pondérée (`FR + 8 × CH`) des 3 dernières années disponibles (2023-2025).
- Fenêtre de référence : même moyenne dix ans plus tôt (2013-2015).
- `up` si la moyenne récente est supérieure d'au moins 25 % à la référence, `down` si elle est inférieure d'au moins
  25 %, `stable` sinon.
- Si les deux moyennes sont inférieures à 20 naissances pondérées par an, la tendance n'est pas significative et
  reste `stable`. Un prénom absent de la fenêtre de référence mais présent au-dessus de ce seuil aujourd'hui est `up`.

## Tables des origines et des significations

`data/origins.json` est une table éditée à la main : `{ "<prénom en minuscules, accents conservés>": "<origine>" }`,
environ 1 200 prénoms courants en France et en Suisse. Les libellés utilisés sont : hébraïque, araméen, grec, latin,
germanique, celtique, breton, irlandais, occitan, basque, italien, espagnol, portugais, anglais, scandinave, slave,
persan, arabe, berbère, africain, turc, hindi, japonais, polynésien, albanais. Les origines étymologiques sont
souvent débattues ; la table donne l'origine la plus communément admise et peut être complétée librement.

`data/meanings.json` suit le même format : `{ "<prénom en minuscules, accents conservés>": "<signification>" }`,
pour les mêmes prénoms que la table des origines. Chaque signification est une courte phrase en français
(au plus 80 caractères, sans point final) : le sens étymologique communément admis, ou pour un diminutif, une
variante ou un composé, le prénom de base et son sens (`diminutif d'Anne, « pleine de grâce »`). Lorsque le sens
est débattu, la valeur le dit (`sens incertain, peut-être « … »`). Les deux tables peuvent être enrichies
indépendamment ; il suffit ensuite de relancer `npm run build:names`.
