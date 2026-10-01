# SQuizz

**SQuizz** est une plateforme de quiz collectif en direct, en français, en ligne sur **[www.squizz.fun](https://www.squizz.fun)**. Un animateur projette le quiz sur un grand écran ; les participants répondent depuis leur téléphone, sans application à installer ni compte à créer. Elle sert pour les soirées, les classes, les formations, les séminaires ou les événements. Service conçu et édité par [Pressweb](https://www.pressweb.fr/).

Version en ligne : voir [CHANGELOG.md](CHANGELOG.md). Historique en clair : [JOURNAL.md](JOURNAL.md). Audit : [AUDIT-2026-09-30.md](AUDIT-2026-09-30.md).

## Comment ça marche

1. **Créer un compte** : une organisation (association, école, entreprise…) s'inscrit sur le site et invite son équipe.
2. **Préparer un quiz** : l'éditeur ajoute les étapes une à une, dans une fenêtre en 4 temps (type, contenu, réglages, aperçu). Chaque question peut avoir une image (ou un GIF), une vidéo, une vidéo YouTube ou un lien, un temps de réponse (5 s à 4 min), des points et une explication affichée avec la correction.
3. **Lancer la partie** : l'écran de l'animateur affiche un code et un QR code. Les joueurs vont sur www.squizz.fun/jouer, entrent le code et un pseudo, puis arrivent dans la salle d'attente.
4. **Jouer** : au lancement de chaque question, tout le monde voit le même compte à rebours « Prêt ? ». Chacun répond sur son téléphone pendant que le grand écran affiche un chrono circulaire et le nombre de réponses.
5. **Résultats** : après chaque question, la bonne réponse et sa répartition s'affichent, puis le classement avec l'évolution des places (▲ ▼ =). La partie se termine sur un podium avec confettis.

## Contenu d'un quiz

**Questions notées** : quiz (choix parmi plusieurs réponses), vrai ou faux, réponse libre (courte réponse à saisir), curseur (nombre à deviner), réponse par pin's (placer un pin's au bon endroit sur une image), puzzle (classer les réponses dans le bon ordre).

**Questions sans bonne réponse**, pour recueillir des avis : sondage (jusqu'à 6 choix), échelle (Likert ou personnalisée), échelle NPS, place le pin's (sur une image), nuage de mots, question ouverte, brainstorming (jusqu'à 3 idées par personne).

**Diapos**, pour introduire une manche ou donner une information entre deux questions, en 6 mises en page : classique, grand titre, titre et texte, liste à puces, citation, grande image.

Les types et leur validation sont définis dans `lib/question.ts`.

## Espaces du site

| Espace | Adresse | Pour qui |
|---|---|---|
| Site public | `/`, `/tarifs`, `/alternative-kahoot`, formulaire de contact, pages légales, inscription et connexion | Visiteurs |
| Jeu | `/jouer` (saisie du code), `/partie/[code]` (partie en cours : grand écran pour l'animateur, téléphone pour les joueurs) | Joueurs et animateurs |
| Espace organisation | `/app` : bibliothèque de quiz, éditeur, équipe, compte | Membres d'une organisation |
| Super-admin | `/super-admin` : organisations, utilisateurs, messages de contact, journal | Pressweb |

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

Définies dans `lib/plans.ts` (limites, prix, textes), qui alimente la page Tarifs, les CGU, la FAQ, les données structurées et `/llms.txt`. Toutes les offres payantes sont **sans engagement** et résiliables à tout moment. Prix nets, TVA non applicable (art. 293 B du CGI).

| | Gratuit | Essentiel | Pro | Premium annuel |
|---|---|---|---|---|
| Prix | 0 € | 15 € / mois | 30 € / mois | 310 € / an |
| Quiz | 1 | 5 | 20 | 50 |
| Joueurs par partie | 5 | 15 | 50 | 80 |
| Membres (animateurs) | 1 | 2 | 5 | 10 |
| Médias | 10 Mo | 250 Mo | 500 Mo | 1 Go |
| Support | — | e-mail | prioritaire | prioritaire |

**Couleurs** : Gratuit blanc, Essentiel orange, Pro bleu électrique, Premium vert acide (cartes, badges).

**Limites** : vérifiées côté serveur, sous un verrou par organisation (`lib/server/org-lock.ts`) pour que deux requêtes simultanées ne dépassent pas ensemble : quiz, membres (invitations, acceptation, réactivation), médias ; joueurs fixés au lancement de la partie. Après un passage à une offre inférieure, les contenus existants sont conservés, seule la création est bloquée.

**Paiement (Stripe)** : `lib/server/billing.ts`. Page « Abonnement » de l'espace (`/app/abonnement`, administrateurs) : souscription par Stripe Checkout, changement d'offre au prorata, arrêt/reprise (fin de période), portail Stripe pour factures et carte. Le webhook `/api/billing/webhook` synchronise l'offre ; à la fin d'un abonnement l'organisation repasse seule sur Gratuit. Produits Stripe dans `lib/plans.ts` (`prod_…` : leur prix par défaut est facturé). Actif seulement si `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont dans `/opt/squizz-secrets.env` ; sinon, souscription par le formulaire de contact et activation à la main dans le super-admin.

**Partenaires** : le super-admin active le statut partenaire d'une organisation (liste ou fiche) ; elle bénéficie gratuitement de Premium, quelle que soit l'offre facturée, et n'est pas comptée dans le revenu.

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

## Éditeur et bibliothèque

- **Brouillons** (`lib/client/drafts.ts`) : le travail en cours est gardé dans le navigateur une seconde après chaque changement, par compte et par quiz (`new` pour un quiz pas encore enregistré), proposé à la restauration après un rechargement, effacé après un enregistrement réussi et au plus tard après 7 jours (même durée que la grâce des médias inutilisés dans `deploy/purge.mjs`). Un autre compte du même navigateur ne le voit jamais. L'état (« Brouillon gardé sur cet appareil… », « Tout est enregistré ») s'affiche près du bouton, et le navigateur prévient avant de quitter avec des modifications non enregistrées.
- **Conflits d'édition** : chaque quiz a une `version`. L'éditeur envoie celle qu'il a ouverte ; le serveur n'écrit que si elle n'a pas changé (un seul `UPDATE … WHERE version = …`). Sinon, réponse 409 avec l'autre version : la personne choisit (enregistrer la sienne comme nouveau quiz, remplacer, reprendre l'autre, continuer). Rien n'est écrasé sans ce choix.
- **Étapes** : dupliquer, annuler la dernière suppression. **Quiz** : dupliquer un quiz de l'équipe ou copier un SQuizz Original (la copie appartient à celui qui copie, compte dans le quota, réutilise les mêmes médias).
- **Export / import** (`lib/server/quiz-transfer.ts`) : « Exporter » sur une carte télécharge un fichier `.squizz` (le quiz et les médias de l'organisation qu'il utilise, en base64 ; les liens externes et les illustrations des Originals restent des liens). « Importer » crée un nouveau quiz à partir de ce fichier, avec les mêmes contrôles que l'éditeur et l'envoi de photo (format réel des fichiers, poids, quotas de quiz et de médias), 20 Mo au plus.
- **Bibliothèque** : recherche par titre (sans tenir compte des accents), tri (dernière modification, titre, ancienneté), filtre « Mes quiz », durée estimée à partir des réglages réels (`lib/quiz-duration.ts`, indicative).

## Réseau lent ou coupé

Toutes les actions ont un délai maximal (15 s ; 2 min pour l'import d'un média) et libèrent leur bouton avec un message clair. Quand la réponse se perd, le résultat est **incertain** (`UncertainError` dans `lib/client/api.ts`) :

- enregistrer, créer, dupliquer, lancer une partie portent une **clé anti-doublon** (`clientKey`) ou une version : ils sont renvoyés une fois automatiquement, sans risque de doublon ;
- répondre, lancer le quiz, passer à la suite : le jeu est relu ; si l'action a eu lieu, tout va bien, sinon un message invite à réessayer. Le serveur ignore une seconde réponse, un second lancement ou un second « suivant » pour la même étape.

## Comptes et sécurité

- **Vérification de l'adresse e-mail** à l'inscription : lien à usage unique valable 24 h (seul son empreinte est stockée), renvoi limité (3 par adresse et 10 par connexion et par heure, même réponse que le compte existe ou non). Tant que l'adresse n'est pas confirmée, la connexion est refusée avec un bouton « Renvoyer le lien ». Le message de bienvenue part après la confirmation. Une invitation acceptée ou une réinitialisation de mot de passe confirment aussi l'adresse. **Comptes existants** : marqués confirmés par la migration. **Super-admin** : jamais bloqué. Inscriptions jamais confirmées : supprimées après 7 jours par la purge.
- **Cookies** (`lib/consent.ts`, `components/site/cookie-consent.tsx`) : le site ne dépose que des cookies strictement nécessaires (pas de publicité ni de mesure d'audience). Bandeau d'information à la première visite (refuser, personnaliser, accepter, avec la même visibilité), panneau « Gérer les cookies » (pied de page, menu du compte, politique de confidentialité), choix gardé 6 mois dans le cookie `sq_consent`. Seul contenu soumis à accord : les vidéos YouTube des quiz, bloquées tant qu'il n'est pas donné (pour une vidéo ou pour toutes). L'anti-robot Cloudflare ne se charge qu'à l'utilisation du formulaire de contact. Pas de bandeau sur les pages de jeu : l'accord se donne sur la vidéo.
- **Tentatives de connexion** (`lib/login-throttle.ts`) : 8 échecs par adresse IP et par compte, 30 tentatives par adresse IP, 60 échecs par compte sur 15 minutes. Ce dernier seuil ne s'applique pas depuis une adresse où le propriétaire s'est déjà connecté (90 jours) : un tiers ne peut pas le bloquer sur ses appareils habituels, et « Mot de passe oublié » reste toujours possible.

## Tests

```sh
npm test                    # unitaires (Vitest) — bloquants au déploiement avec tsc et le lint
npm run test:e2e:isolated   # intégration sur une base jetable squizz_e2e et un serveur :5174 (recommandé)
npm run test:e2e            # intégration contre le serveur de dev sur :5173 (base de développement)
```

`scripts/e2e.sh` recrée la base locale `squizz_e2e` (refuse toute base non locale ou dont le nom ne finit pas par `_e2e`/`_test`), la migre, crée le super-admin de test, démarre un serveur de dev avec son propre dossier de build (`.next-e2e`), sans SMTP, Stripe ni Turnstile, puis lance les scénarios. `bash scripts/e2e.sh editing` n'en lance qu'un.

Intégration : `game-flow`, `rich-game-flow`, `game-live` (plafond de joueurs en concurrence, retrait d'un joueur, compte à rebours), `quiz-management`, `accounts` (rôles, offres, partenaires, super-admin), `rights` (export, suppression de compte), `security` (requêtes d'autres sites, pas de verrouillage, puzzle), `editing` (conflits, anti-doublons, duplication, actions de jeu répétées), `email-verification`, `contact`, `super-admin`, `timeout`. Les limites de débit sont multipliées par 100 hors production pour que les tests puissent créer de nombreux comptes.

**Intégration continue** (`.github/workflows/ci.yml`) : à chaque envoi sur `main`/`plateforme` et pour chaque pull request, types, lint, formatage et tests unitaires, puis les scénarios d'intégration sur un PostgreSQL jetable.

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

**Tâches planifiées** : sauvegarde 2 h 15 (base + médias, contenu vérifié, 7 jours + dimanches sur 5 semaines, alerte si plus de 26 h), purge 3 h 30 (`deploy/purge.mjs` : parties 24 h, journal 12 mois, contact 3 ans, inscriptions non confirmées 7 jours, médias inutilisés depuis 7 jours), santé toutes les 5 min. Alertes vers `ALERT_EMAIL` (contact@pressweb.fr).

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
