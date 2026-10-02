# Test de charge — SQuizz 1.8.2

Le scénario de cinq organisations Premium, chacune avec une partie de 80 joueurs, passe sur le build local de production. Ce résultat ne mesure pas la capacité du VPS déployé.

## Scénario

- 5 comptes administrateurs, 5 organisations et 5 quiz séparés.
- 400 identités joueurs, 5 écrans animateurs et consultations des bibliothèques toutes les 5 secondes.
- Actualisation des écrans 900 ms après chaque réponse HTTP, comme dans l'application, avec démarrages décalés.
- 3 questions par partie, vagues de 400 réponses sur environ deux secondes par tour, passage à la question suivante et fin de partie.
- Contrôle des 80 joueurs et des 80 réponses révélées à chaque tour dans chaque partie, puis classement final et scores positifs.

## Résultat final

156 secondes de charge, 67 153 requêtes, aucune erreur HTTP, réseau ou d'intégrité. 1 200 réponses acceptées. Environ 418 actualisations réussies par seconde et 424 Mio de corps de réponses reçus sur l'ensemble du scénario.

| Action | Requêtes | Latence médiane | p95 | p99 | Erreurs |
|---|---:|---:|---:|---:|---:|
| Entrée des joueurs | 400 | 35 ms | 333 ms | 336 ms | 0 |
| Actualisation joueurs | 64 551 | 34 ms | 105 ms | 205 ms | 0 |
| Actualisation animateurs | 807 | 31 ms | 103 ms | 204 ms | 0 |
| Réponses | 1 200 | 24 ms | 59 ms | 91 ms | 0 |
| Actions animateurs | 20 | 18 ms | 36 ms | 37 ms | 0 |
| Bibliothèques | 155 | 26 ms | 123 ms | 208 ms | 0 |

p95 signifie que 95 % des requêtes de cette catégorie terminent dans ce délai. Les mesures incluent le transport local, la lecture des réponses et, dans le dernier essai, l'attente éventuelle d'une connexion du générateur.

## Essais précédents et diagnostic

Deux essais avec le transport natif `fetch` de Node ont présenté des erreurs réseau d'actualisation : 120 au premier essai, puis 9 réinitialisations `ECONNRESET` après deux tours du second. Le premier essai s'est terminé sans échec HTTP, réponse perdue ou anomalie de classement. Le second générateur s'est ensuite arrêté sur une exception native de Node 24.19.0, `setTypeOfService EINVAL`, dans `node:internal/deps/undici` : cet essai est incomplet, et son journal est conservé.

Le dernier essai remplace le transport du générateur par un agent HTTP avec connexions persistantes, borné à 128 connexions simultanées. Les 400 identités, le rythme et les actions restent identiques. Il passe sans erreur. Le crash du second essai est localisé dans le transport du générateur ; la cause exacte de chaque réinitialisation réseau n'est pas déterminée. Les données des essais précédents sont conservées, sans les masquer.

## Environnement et limites

- Serveur Next en mode production, un processus Node, PostgreSQL local et base isolée `squizz_e2e` ; générateur et serveurs sur la même machine.
- Fixtures préparées sur le serveur de test, puis jeu exécuté sur le build de production au port 5190 ; nettoyage des processus à la fin.
- Aucune modification du code de l'application, aucun paiement, email réel ou accès à la production.
- Une adresse IP simulée par organisation, partagée par ses 80 joueurs, pour représenter cinq établissements distincts. Les headers IP sont envoyés uniquement au serveur local, sans Nginx.
- Clients HTTP avec identités distinctes : ce ne sont pas 400 navigateurs qui exécutent et affichent React. Le test ne mesure ni le rendu mobile, ni les ressources des téléphones, ni TLS/Nginx, ni des transferts vidéo ou uploads, ni la charge sur plusieurs heures.
- Les quiz et classements sont vérifiés par partie. Ce test de performance ne remplace pas l'audit des permissions entre organisations.
- Les métriques CPU/RAM du serveur n'ont pas été mesurées. Ce résultat ne donne pas une capacité maximale ni une garantie pour une autre machine.

## Reproduction

Avec un build de production à jour, Node compatible et PostgreSQL local :

```sh
LOAD_CLIENTS=5 bash scripts/e2e.sh load-multiclient
```

Le script recrée exclusivement la base locale de test. `LOAD_CLIENTS` accepte de 1 à 20 organisations, chacune avec 80 joueurs. Le générateur échoue si une requête ou une vérification d'intégrité échoue.

Fichiers : `tests/load-multiclient.py`, `audit/load-multiclient.mjs`, `audit/load-5x80.json` (résultat final), `audit/load-5x80-initial.json` et `audit/load-5x80-fetch-diagnostic.log` (essais précédents).

La suite utile est de rejouer ce scénario sur un environnement de préproduction comparable au VPS, depuis une autre machine, puis de monter à 10 et 20 organisations et d'allonger la durée.
