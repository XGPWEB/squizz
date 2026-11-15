# Test de charge en conditions dégradées — 15 novembre 2026 (révisé)

Complète [AUDIT-CHARGE-2026-10-01.md](AUDIT-CHARGE-2026-10-01.md) (5 salles × 80 joueurs, conditions nominales). Exécuté **uniquement en local**, sur la base jetable `squizz_e2e` et un build de production local ; aucune requête vers la production. Ce résultat ne mesure pas la capacité du VPS.

**Correction de la première version de ce rapport.** Dans le premier essai, la coupure « reconnexion » durait 8 s mais commençait 10 s avant la vague de réponses : elle ne la chevauchait pas, et la « perte de réponse » n’était qu’un second envoi, identique au test de doublon. Ces deux résultats ne prouvaient donc pas ce qu’ils annonçaient. Le générateur a été corrigé et l’essai refait ; les chiffres ci-dessous remplacent les précédents.

## Les cas testés, chacun séparément

Toutes les options sont désactivées par défaut : le scénario de référence ne change pas. Un joueur est dans un seul cas par manche, choisi par une règle fixe (deux essais prennent les mêmes joueurs).

| Variable | Cas | Ce qui est vérifié |
|---|---|---|
| `LOAD_BURST=1` | tous les joueurs d’une salle répondent au même instant | aucune erreur |
| `LOAD_LATENCY_MS=n` | chaque requête attend de 0 à n ms avant de partir | aucune erreur |
| `LOAD_DUPLICATE` | la même réponse envoyée deux fois, les deux retours reçus | le second envoi est accepté sans être compté |
| `LOAD_LOSS` | la réponse est traitée par le serveur, son retour est coupé avant lecture | le client relit la partie (comme l’application) ; il ne renvoie que si sa réponse manque |
| `LOAD_RECONNECT` | coupure de 8 s **commençant avec la vague** : aucune requête, puis retour avec le même cookie | la partie relue au retour est toujours sur la question ouverte, la réponse envoyée dans le délai est comptée exactement une fois |
| `LOAD_LATE=1` | deux joueurs par salle et par manche répondent après que l’animateur a fermé la question | rejet propre (400, « Le temps est écoulé »), rien n’est compté |

Contrôles à chaque manche : 80 joueurs, nombre de réponses égal au nombre de joueurs non tardifs. À la fin : chaque joueur a entre 500 et 1 000 points par réponse acceptée, jamais plus (un double comptage le ferait dépasser), autant de bonnes réponses que de réponses acceptées, classement trié et rangs cohérents.

## Scénario exécuté

```sh
LOAD_CLIENTS=3 LOAD_BURST=1 LOAD_LATENCY_MS=400 LOAD_DUPLICATE=0.05 LOAD_LOSS=0.05 \
  LOAD_RECONNECT=0.1 LOAD_LATE=1 bash scripts/e2e.sh load-multiclient
```

3 salles simultanées de 80 joueurs (240 identités), 3 questions de 120 s, actualisation toutes les 900 ms, bibliothèques consultées toutes les 5 s. Résultat : `audit/load-3x80-degraded.json`.

## Résultat

137 s de charge, **0 erreur, 0 anomalie d’intégrité ni de score**.

| Cas | Nombre | Résultat |
|---|---:|---|
| Doublons volontaires | 30 | 30 ignorés, aucun compté deux fois |
| Retours de réponse perdus | 36 | 36 réponses retrouvées en relisant la partie, 0 renvoi nécessaire |
| Coupures pendant la vague | 60 | 60 réponses envoyées après le retour, chacune comptée une fois |
| Réponses tardives | 18 | 18 rejetées proprement |

| Requête | Nombre | Médiane | p95 | p99 | Max | Erreurs |
|---|---:|---:|---:|---:|---:|---:|
| Entrée des joueurs | 240 | 5 ms | 178 ms | 276 ms | 295 ms | 0 |
| Actualisation joueurs | 28 336 | 1 ms | 4 ms | 9 ms | 285 ms | 0 |
| Actualisation animateurs | 356 | 2 ms | 6 ms | 17 ms | 220 ms | 0 |
| Réponses (rafale) | 606 | 4 ms | 25 ms | 45 ms | 52 ms | 0 |
| Réponses au retour perdu | 36 | 4 ms | 27 ms | 48 ms | 48 ms | 0 |
| Relecture après perte | 36 | 1 ms | 5 ms | 7 ms | 7 ms | 0 |
| Doublons | 30 | 3 ms | 8 ms | 12 ms | 12 ms | 0 |
| Relecture au retour du réseau | 120 | 1 ms | 72 ms | 216 ms | 259 ms | 0 |
| Réponses après reconnexion | 60 | 5 ms | 67 ms | 272 ms | 272 ms | 0 |
| Réponses tardives (rejet attendu) | 18 | 5 ms | 12 ms | 12 ms | 12 ms | 0 |
| Actions animateurs | 21 | 9 ms | 29 ms | 35 ms | 35 ms | 0 |
| Bibliothèques | 78 | 11 ms | 23 ms | 40 ms | 40 ms | 0 |

Les latences sont mesurées à partir du départ réel de la requête : l’attente simulée du réseau lent n’y est pas comptée. Les reconnexions arrivent toutes ensemble à la fin des 8 s, d’où leur p95 plus élevé.

## En vrai navigateur

`tests/browser/reseau.pw.ts` (Chromium et WebKit, serveur et base isolés) : un joueur sur téléphone
- répond, le serveur traite la réponse et son retour est coupé : le téléphone relit la partie, montre sa réponse, n’affiche pas d’erreur, n’envoie rien deux fois (1 réponse comptée) ;
- perd le réseau pendant la question suivante : « Connexion perdue, reconnexion… », la réponse tentée hors ligne n’arrive pas ; au retour du réseau la partie reprend sur la même question, la réponse passe une fois, un second appui ne change rien ;
- termine avec 2 bonnes réponses et un score compris entre 1 000 et 2 000 points.

## Limites

- Générateur et serveur sur la même machine (un Mac), un seul processus Node, PostgreSQL local : pas de TLS, pas de Nginx, pas de vrai réseau mobile.
- Clients HTTP pour la charge : le rendu sur 240 téléphones n’est pas mesuré ; le parcours navigateur porte sur un seul joueur.
- Un joueur qui perd son cookie ne peut pas revenir dans une partie commencée (comportement voulu : « La partie a déjà commencé ») : ce cas n’est pas chargé.
- La perte de réponse simulée coupe le retour **après** traitement par le serveur ; une requête perdue avant d’arriver est le cas simple (la réponse manque, le client la renvoie) et n’est pas mesurée à part.
- Pas de mesure CPU/RAM du serveur ; pas de durée longue.
- Conclusion inchangée : rien ne justifie WebSocket, Redis ou une nouvelle infrastructure, ni de relever le plafond de 80 joueurs, sans mesure en préproduction comparable au VPS, depuis une autre machine, avec 10 à 20 salles.

# Exercice de restauration

`scripts/restore-drill.sh` restaure une sauvegarde dans une base **nouvelle**, au nom unique (`squizz_restore_drill_<date>_<aléa>`), puis la supprime. Révisé après revue :

- toutes les entrées (fichier, archive des médias, adresse et nom de la base, outils) sont vérifiées **avant** toute commande sur une base : un fichier absent ou corrompu ne déclenche plus aucune suppression ;
- le script refuse de continuer si le nom existe déjà, et ne supprime que la base qu’il a créée lui-même ; les noms utilisés en SQL sont validés ;
- les migrations sont comparées **par leur nom** avec `prisma/migrations` (manquantes, inconnues, inachevées : échec) ;
- comparaison des nombres de lignes avec la source : `RESTORE_DRILL_COMPARE=strict` (source figée, tout écart fait échouer), `live` (source vivante : écarts affichés, « intégrité comparative NON validée »), `none` ;
- verdict : « RÉUSSI » (code 0) seulement si tout a été vérifié et passé ; « PARTIEL » (code 3) si la comparaison n’a pas été validée ; « ÉCHEC » (code 1) sinon.

Tests : `tests/restore-drill.spec.ts` (12 cas avec de faux `psql` et `pg_dump` : fichier absent, archive corrompue, nom de base douteux, échec de création, collision, nettoyage après échec, noms uniques, migration manquante, verdicts partiel, vivant et strict).

Exécutions réelles le 15/11, en local seulement : copie de la base de développement en mode vivant → « PARTIEL », 0 écart ; copie figée jetable en mode strict → « RÉUSSI », 24 migrations identiques par leur nom, 22 tables, nombres de lignes identiques ; aucune base d’exercice restante.

**Ce n’est toujours pas la preuve qu’une sauvegarde de production se restaure** : aucun fichier produit par `backup-squizz.sh` sur le VPS n’a été testé. À faire par Xavier, depuis une copie du dépôt sur le serveur (le script lit `prisma/`), sans écrire dans la base de production :

```sh
set -a && . /opt/squizz-secrets.env && set +a
MEDIA_ARCHIVE=/opt/backups/squizz-db/squizz-media-AAAAMMJJ-HHMM.tar.gz \
  bash scripts/restore-drill.sh /opt/backups/squizz-db/squizz-AAAAMMJJ-HHMM.sql.gz
```

Sans source figée, le résultat attendu est « PARTIEL » : la restauration, les tables et les migrations sont prouvées, pas l’égalité des nombres de lignes.
