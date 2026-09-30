# SQuizz

Plateforme de quiz collectif en français, sur **www.squizz.fun** : site vitrine, espace des organisations (quiz, animateurs, droits), super-admin, et jeu en direct rejoint par les joueurs avec un code ou un QR code. Service conçu par [Pressweb](https://www.pressweb.fr/), sur le même principe que Barber Q PRO.

Version en ligne : voir [CHANGELOG.md](CHANGELOG.md). Historique en clair : [JOURNAL.md](JOURNAL.md). Audit : [AUDIT-2026-09-30.md](AUDIT-2026-09-30.md).

## Rôles

| Rôle | Peut |
|---|---|
| **Super-admin** (Pressweb) | Voir toutes les organisations, changer leur offre, les suspendre ou les supprimer, gérer les utilisateurs, créer des liens de réinitialisation, consulter le journal |
| **Administrateur** d’une organisation | Tout ce que fait un animateur + inviter des membres, changer leur rôle, les désactiver ou les supprimer, modifier tous les quiz de l’organisation |
| **Animateur** | Créer des quiz, modifier/supprimer les siens, lancer des parties avec tous les quiz de l’organisation |
| **Joueur** | Rejoindre une partie avec un pseudo, sans compte |

Le super-admin se connecte sur **www.squizz.fun/super-admin/connexion**, avec sa propre session (cookie séparé, 12 h) : on peut être connecté au super-admin et à un compte client dans le même navigateur. Le compte super-admin est refusé sur la connexion client, et les comptes clients sur celle du super-admin.

Une organisation garde toujours au moins un administrateur actif. Désactiver un membre, changer son mot de passe ou suspendre l’organisation coupe immédiatement ses sessions.

## Offres

Définies dans `lib/plans.ts`, attribuées à la main depuis le super-admin (Stripe viendra plus tard).

| | Gratuit | Pro |
|---|---|---|
| Quiz | 5 | illimités |
| Joueurs par partie | 20 | 100 |
| Membres | 3 | illimités |
| Médias | 100 Mo | 5 Go |

## Stack

Next.js 16 (App Router, sortie `standalone`), PostgreSQL + Prisma 5, NextAuth 4 (email + mot de passe, JWT revérifié à chaque requête), médias sur disque (`MEDIA_DIR`), Nodemailer (SMTP optionnel : sans SMTP, les liens d’invitation et de réinitialisation sont écrits dans les logs et affichés aux administrateurs).

```
app/(site)/        site public : accueil, tarifs, jouer, partie, connexion, inscription, légal
app/app/           espace organisation : bibliothèque, éditeur, équipe, compte
app/super-admin/   super-admin : organisations, détail, journal
app/api/           game (jeu + quiz), media, account, invitations, org, admin, auth, health
lib/server/        guard (droits), game, quiz-store, accounts, rate-limit, audit, mail
lib/question.ts    14 types de questions, 6 diapos, validation et correction
prisma/            schéma, migrations, seed
deploy/            scripts serveur (préparation, HTTPS, Nginx, super-admin)
```

## Développement

Node.js 20.9 ou ultérieur, PostgreSQL local.

```sh
npm install
cp .env.example .env        # puis renseigner DATABASE_URL, AUTH_SECRET, SEED_*
npx prisma migrate dev
npm run db:seed             # super-admin (+ organisation de démo si SEED_DEMO=1)
npm run dev -- --port 5173
```

## Tests

```sh
npm test                    # unitaires (Vitest) — bloquants au déploiement avec tsc et le lint
npm run test:e2e            # intégration contre le serveur de dev sur :5173
```

Intégration : `game-flow`, `rich-game-flow`, `game-live` (plafond de joueurs en concurrence, retrait d'un joueur, compte à rebours), `quiz-management`, `accounts` (rôles, offres, super-admin), `rights` (export, suppression de compte), `security` (requêtes d'autres sites, pas de verrouillage, puzzle), `contact`, `super-admin`, `timeout`. Les limites de débit sont multipliées par 100 hors production pour que les tests puissent créer de nombreux comptes.

## Versions

Numérotation `MAJEUR.MINEUR.CORRECTIF` ([SemVer](https://semver.org/lang/fr/)) : correctif pour une correction, mineur pour une nouveauté, majeur pour un changement qui casse l'existant (données, adresses, comptes). La branche `main` correspond à ce qui est en ligne ; chaque mise en ligne notable reçoit une étiquette `vX.Y.Z` et une entrée dans [CHANGELOG.md](CHANGELOG.md).

Publier une version (sur le Mac, dans le dossier du projet) :

```sh
npm version minor --no-git-tag-version   # ou patch / major : met à jour package.json
# compléter CHANGELOG.md, puis :
git commit -am "Version X.Y.Z"
git tag -a vX.Y.Z -m "Version X.Y.Z"
git push origin main --tags
gh release create vX.Y.Z --notes-from-tag
```

## Déploiement (VPS Hostinger)

SQuizz tourne sous l'utilisateur système `squizz` avec son propre PM2 (Node 24, port 3010, `/opt/squizz`), base PostgreSQL dédiée `squizz`, Nginx + Let's Encrypt.

| Commande | Rôle |
|---|---|
| `bash deploy.sh` | Types, lint, tests, build, **dump de la base**, migrations, bascule, contrôle de santé, **retour automatique** à la version précédente en cas d'échec |
| `bash deploy.sh --rollback` | Remet la version précédente (`/opt/squizz/app-prev`) ; la base n'est pas modifiée |
| `bash deploy.sh --nginx` | Met à jour le site Nginx ; l'ancienne config est remise si `nginx -t` échoue |
| `bash deploy.sh --setup` | Préparation idempotente : utilisateur, base, secrets, sauvegardes, purge, santé, cron, module rsync, logrotate |
| `bash deploy.sh --https` | Première mise en place du certificat |

**Tâches planifiées** : sauvegarde 2 h 15 (base + médias, contenu vérifié, 7 jours + dimanches sur 5 semaines, alerte si plus de 26 h), purge 3 h 30 (`deploy/purge.mjs` : parties 24 h, journal 12 mois, contact 3 ans, médias inutilisés), santé toutes les 5 min. Alertes vers `ALERT_EMAIL` (contact@pressweb.fr).

**Copie hors serveur** : le module rsync `squizz-backups` (même compte et mêmes restrictions que Pôle Jeunesse) doit être récupéré par le NAS.

**Restaurer une sauvegarde** (sur le VPS, en root) :

```sh
set -a; . /opt/squizz-secrets.env; set +a; U="${DATABASE_URL%%\?*}"
bash /opt/squizz/remote-release.sh rollback            # si le code est en cause
gunzip -c /opt/backups/squizz-db/pre-deploy-AAAAMMJJ-HHMMSS.sql.gz | psql "$U"   # base vide requise
tar -xzf /opt/backups/squizz-db/squizz-media-AAAAMMJJ-HHMM.tar.gz -C /opt && chown -R squizz:squizz /opt/squizz-media
```

Tester d'abord la restauration dans une base temporaire (`createdb squizz_restore`) avant d'écraser la production.

**Super-admin** : `cd /opt/squizz/app && set -a && . /opt/squizz-secrets.env && set +a && /opt/node24/bin/node create-super-admin.mjs contact@pressweb.fr` affiche un lien valable 1 heure pour choisir le mot de passe.
