# Test de charge en conditions dégradées — 15 novembre 2026

Complète [AUDIT-CHARGE-2026-10-01.md](AUDIT-CHARGE-2026-10-01.md) (5 salles × 80 joueurs, conditions nominales). Exécuté **uniquement en local**, sur la base jetable `squizz_e2e` et un build de production local ; aucune requête vers la production. Ce résultat ne mesure pas la capacité du VPS.

## Ce qui a été ajouté au générateur

`audit/load-multiclient.mjs` accepte des conditions optionnelles (toutes désactivées par défaut : le scénario de référence ne change pas) :

| Variable | Effet |
|---|---|
| `LOAD_BURST=1` | tous les joueurs d’une salle répondent au même instant (sans l’étalement de 100 ms) |
| `LOAD_LATENCY_MS=n` | chaque requête attend de 0 à n ms avant de partir (réseau mobile lent) |
| `LOAD_LOSS=0.05` | 5 % des réponses « perdues » : la même réponse est renvoyée, comme le fait l’application ; le serveur doit la compter une fois |
| `LOAD_RECONNECT=0.1` | 10 % des joueurs coupés 8 s autour de chaque vague de réponses (aucune requête), puis de retour avec le même cookie ; ils répondent à leur retour |

Nouvelle vérification de cohérence des scores, dans tous les modes : chaque joueur final a entre 1 500 et 3 000 points (3 bonnes réponses, points standard), le classement est trié, et chaque rang vaut 1 + le nombre de scores strictement supérieurs. Le fichier de résultat prend le suffixe `-degraded` dès qu’une condition est active.

## Scénario exécuté

```sh
LOAD_CLIENTS=3 LOAD_BURST=1 LOAD_LATENCY_MS=400 LOAD_LOSS=0.05 LOAD_RECONNECT=0.1 bash scripts/e2e.sh load-multiclient
```

3 salles simultanées de 80 joueurs (240 identités), 3 questions par salle, actualisation toutes les 900 ms, bibliothèques consultées toutes les 5 s. Résultat : `audit/load-3x80-degraded.json`.

## Résultat

151 s de charge, **0 erreur HTTP, réseau ou d’intégrité**, 0 anomalie de score. 41 réponses renvoyées après « perte » et 85 coupures de 8 s : chaque salle compte exactement 80 réponses à chaque question.

| Action | Requêtes | Médiane | p95 | p99 | Max | Erreurs |
|---|---:|---:|---:|---:|---:|---:|
| Entrée des joueurs | 240 | 5 ms | 255 ms | 318 ms | 347 ms | 0 |
| Actualisation joueurs | 32 005 | 1 ms | 6 ms | 22 ms | 289 ms | 0 |
| Actualisation animateurs | 408 | 2 ms | 9 ms | 34 ms | 224 ms | 0 |
| Réponses (rafale simultanée) | 720 | 4 ms | 21 ms | 28 ms | 36 ms | 0 |
| Réponses renvoyées | 41 | 3 ms | 6 ms | 17 ms | 17 ms | 0 |
| Actions animateurs | 12 | 19 ms | 49 ms | 49 ms | 49 ms | 0 |
| Bibliothèques | 87 | 13 ms | 34 ms | 131 ms | 131 ms | 0 |

Les latences sont mesurées à partir du départ réel de la requête : l’attente simulée du réseau lent n’y est pas comptée.

## Limites

- Générateur et serveur sur la même machine (un Mac), un seul processus Node, PostgreSQL local : pas de TLS, pas de Nginx, pas de vrai réseau.
- Clients HTTP, pas des navigateurs : le rendu sur téléphone n’est pas mesuré.
- Une reconnexion garde le cookie du joueur ; un joueur qui perd son cookie ne peut pas revenir dans une partie commencée (comportement voulu : « La partie a déjà commencé »). Ce cas n’est pas chargé.
- Pas de mesure CPU/RAM du serveur ; pas de durée longue.
- Conclusion : rien ne justifie à ce stade WebSocket, Redis ou une nouvelle infrastructure ; rien ne justifie non plus de relever le plafond de 80 joueurs sans une mesure en préproduction comparable au VPS, depuis une autre machine, avec 10 à 20 salles.

# Exercice de restauration

`scripts/restore-drill.sh` (nouveau) restaure une sauvegarde dans une base jetable (`*_restore_drill`, supprimée à la fin), vérifie la présence de toutes les tables du schéma Prisma, l’état des migrations et, sans fichier fourni, compare le nombre de lignes avec la source (lue seulement). Une archive de médias peut être listée et extraite dans un dossier temporaire (`MEDIA_ARCHIVE=…`).

**Exécuté le 15/11 sur la base locale de développement** : 24 migrations appliquées sur 24, 22 tables, nombres de lignes identiques à la source. **Ce n’est pas la preuve qu’une sauvegarde de production se restaure** : aucun fichier produit par `backup-squizz.sh` sur le VPS n’a été testé, et aucune commande n’a été lancée sur le serveur.

À faire par Xavier sur le VPS (lecture des sauvegardes uniquement, base jetable) :

```sh
cd /chemin/vers/une/copie/du/depot && set -a && . /opt/squizz-secrets.env && set +a
MEDIA_ARCHIVE=/opt/backups/squizz-db/squizz-media-AAAAMMJJ-HHMM.tar.gz \
  bash scripts/restore-drill.sh /opt/backups/squizz-db/squizz-AAAAMMJJ-HHMM.sql.gz
```

Le script n’est pas copié sur le serveur par `deploy.sh`, et il lit `prisma/schema.prisma` et `prisma/migrations` : le lancer depuis une copie du dépôt (ou l’ajouter au déploiement après validation).
