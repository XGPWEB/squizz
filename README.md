# SQuizz

Plateforme de quiz collectif en français, sur **www.squizz.fun** : site vitrine, espace des organisations (quiz, animateurs, droits), super-admin, et jeu en direct rejoint par les joueurs avec un code ou un QR code. Service conçu par [Pressweb](https://www.pressweb.fr/), sur le même principe que Barber Q PRO.

## Rôles

| Rôle | Peut |
|---|---|
| **Super-admin** (Pressweb) | Voir toutes les organisations, changer leur offre, les suspendre ou les supprimer, gérer les utilisateurs, créer des liens de réinitialisation, consulter le journal |
| **Administrateur** d’une organisation | Tout ce que fait un animateur + inviter des membres, changer leur rôle, les désactiver ou les supprimer, modifier tous les quiz de l’organisation |
| **Animateur** | Créer des quiz, modifier/supprimer les siens, lancer des parties avec tous les quiz de l’organisation |
| **Joueur** | Rejoindre une partie avec un pseudo, sans compte |

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
app/admin/         super-admin : organisations, détail, journal
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
npm test                    # unitaires (Vitest) — bloquants au déploiement
npm run test:e2e            # intégration contre le serveur de dev sur :5173
```

`tests/accounts.py` couvre les droits : inscription, invitations, rôles, isolation entre organisations, limites des offres, dernier administrateur, désactivation, super-admin (offres, suspension, réinitialisation, journal, suppression), changement et réinitialisation du mot de passe. Les limites de débit (connexion, inscription) sont multipliées par 100 hors production pour que les tests puissent créer de nombreux comptes.

## Déploiement (VPS Hostinger)

Même méthode que les autres applications du VPS : app Next.js standalone lancée par PM2 (Node 24, port 3010, `/opt/squizz`), base PostgreSQL dédiée `squizz`, Nginx + Let’s Encrypt, sauvegarde quotidienne (base + médias, 7 jours) et contrôle de santé toutes les 5 minutes avec alerte email.

1. `bash deploy.sh --setup` — une seule fois : base, utilisateur, secrets (`/opt/squizz-secrets.env`, générés sur le serveur), dossiers, sauvegarde, santé, cron.
2. Dans hPanel Hostinger → DNS de squizz.fun : enregistrements **A** `@` et `www` vers l’IP du VPS.
3. `bash deploy.sh --https` — une fois le DNS propagé : site Nginx + certificat.
4. `bash deploy.sh` — à chaque mise en production : tests, build, migrations, bascule (version précédente gardée dans `/opt/squizz/app-prev`), redémarrage, contrôle de santé.
5. Super-admin : sur le VPS, `cd /opt/squizz/app && set -a && . /opt/squizz-secrets.env && set +a && /opt/node24/bin/node create-super-admin.mjs contact@pressweb.fr` affiche un lien valable 1 heure pour choisir le mot de passe.
