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

**Questions notées** : quiz (choix parmi plusieurs réponses), vrai ou faux, réponse libre (courte réponse à saisir), blind test, curseur (nombre à deviner), réponse par pin's (placer un pin's au bon endroit sur une image), puzzle (classer les réponses dans le bon ordre), textes à trous (mots à trouver entre crochets dans le texte : `[Paris]`, `[Rome|Roma]` ; `parseBlanks()`), appariement (relier chaque élément à sa correspondance ; `targets` et `order`, mélangés au lancement de la partie comme le puzzle).

**Questions sans bonne réponse**, pour recueillir des avis : sondage (jusqu'à 6 choix), échelle (Likert ou personnalisée), échelle NPS, place le pin's (sur une image), nuage de mots, question ouverte, brainstorming (jusqu'à 3 idées par personne).

**Diapos**, pour introduire une manche ou donner une information entre deux questions, en 6 mises en page : classique, grand titre, titre et texte, liste à puces, citation, grande image.

**Roue de tirage au sort**, sans réponse comme une diapo (`asksNothing()`) : les pseudos des joueurs, ou une liste de 2 à 30 entrées. L'action `spin` de l'animateur tire au sort côté serveur (`lib/wheel.ts`) et enregistre le tirage dans `Room.spin` ; chaque écran calcule l'angle à partir du temps écoulé depuis le tirage, donc tous s'arrêtent ensemble sur la même entrée. `after` (le tirage vu par l'animateur) évite un second tirage quand un clic est renvoyé ; le tirage est effacé à l'étape suivante.

Les types et leur validation sont définis dans `lib/question.ts`.

## Espaces du site

| Espace | Adresse | Pour qui |
|---|---|---|
| Site public | `/`, `/tarifs`, `/alternative-kahoot`, formulaire de contact, pages légales, inscription et connexion | Visiteurs |
| Jeu | `/jouer` (saisie du code), `/partie/[code]` (partie en cours : grand écran pour l'animateur, téléphone pour les joueurs) | Joueurs et animateurs |
| Espace organisation | `/app` : bibliothèque de quiz, éditeur, équipe, compte | Membres d'une organisation |
| Super-admin | `/super-admin` : organisations, utilisateurs, messages de contact, journal | Pressweb |

## Génération par IA

`lib/ai-quiz.ts` (schéma JSON de la réponse, consignes, conversion en étapes vérifiées par `validateQuestion`) et `lib/server/ai.ts`. L'organisation connecte son propre compte (`Organization.aiProvider`, `aiKey`, `aiKeyHint`, `aiModel`) dans la fenêtre « Créer avec l'IA » de la bibliothèque (administrateurs, `PUT /api/org/ai`). La clé est chiffrée par `lib/server/secret-box.ts` (AES-256-GCM) avec `AI_KEY_SECRET` (32 octets en base64, dans `/opt/squizz-secrets.env`) : sans elle, la génération est désactivée ; si elle change, les clés enregistrées deviennent illisibles et les administrateurs doivent les recoller. `POST /api/ai/generate` appelle Claude avec le SDK officiel (`claude-opus-5-5` par défaut, sortie structurée `output_config.format`, repli serveur en cas de refus) ou ChatGPT (`/v1/chat/completions`, `response_format` `json_schema`, `gpt-5` par défaut, PDF non pris en charge), puis le client enregistre le quiz et ouvre l'éditeur (`?ok=ia`). Nginx laisse 3 minutes à `/api/ai/`.

## Quiz en autonomie

`lib/server/solo.ts` : `SoloSession` (le secret du lien `/solo/<id>`, une copie du quiz, la date de fin) et `SoloRun` (une participation : étape en cours, heure de départ côté serveur pour les points de vitesse, réponses). Actions `solo` (bibliothèque), `replay` (animateur, partie terminée, `Room.replayId`) et `solo-close` sur `/api/game` ; `join`, `state`, `answer`, `next` sur `/api/solo`. À chaque participant qui termine, `saveSoloReport()` réécrit le rapport `solo-<id>`. La purge supprime les liens le lendemain de leur fin.

## Questions du public

`lib/server/qa.ts` : `Room.qaOpen` et `Room.qaModerated`, tables `QaQuestion` (statut `pending`, `visible`, `answered` ou `hidden` ; pseudo affiché ou `null` si anonyme) et `QaVote`, supprimées avec la partie. Le mur est lu une fois par instantané de la partie et filtré pour chaque visiteur (`wallFor`) : l'animateur voit tout, un joueur les questions validées et les siennes. Actions `qa-ask` et `qa-vote` (joueurs, limite par adresse), `qa-settings` et `qa-moderate` (animateur et télécommande). Les questions affichées vont dans le rapport (`ReportData.qa`, sans les noms).

## Télécommande

Bouton « Télécommande » du grand écran : l'action `remote` (animateur) crée une fois pour toutes le secret de la partie (`Room.remoteToken`) et le QR code mène à `/telecommande/<code>#<secret>`. La page lit le secret dans le fragment et l'envoie en POST (`remote`), jamais dans une adresse ; `remoteHost()` (comparaison à temps constant) le fait parler pour l'animateur, uniquement pour `state`, `start`, `next`, `close`, `spin` et `kick`. `close` arrête une question avant la fin du temps.

## Mode équipes

Activé dans la salle d'attente (`Room.teams`, de 2 à 6, 0 sinon ; actions `teams`, `team` du joueur, `shuffle`). L'équipe de chaque joueur est `Player.team`. Au lancement, `fillTeams()` (`lib/teams.ts`) place ceux qui n'ont pas choisi dans les équipes les moins remplies. Le score d'une équipe est la moyenne de ses joueurs (`teamStandings()`), envoyée dans l'état de la partie et gardée dans les résultats.

## Rôles

| Rôle | Peut |
|---|---|
| **Super-admin** (Pressweb) | Voir toutes les organisations, changer leur offre, les suspendre ou les supprimer, gérer les utilisateurs, créer des liens de réinitialisation, consulter le journal |
| **Administrateur** d’une organisation | Tout ce que fait un animateur + inviter des membres, changer leur rôle, les désactiver ou les supprimer, modifier tous les quiz de l’organisation |
| **Animateur** | Créer des quiz, modifier/supprimer les siens, lancer des parties avec tous les quiz de l’organisation |
| **Joueur** | Rejoindre une partie avec un pseudo, sans compte |

Le super-admin se connecte sur **www.squizz.fun/super-admin/connexion**, avec sa propre session (cookie séparé : 30 jours sans activité, renouvelé pendant l'utilisation, 90 jours au plus avant de redemander le mot de passe) : on peut être connecté au super-admin et à un compte client dans le même navigateur. Le compte super-admin est refusé sur la connexion client, et les comptes clients sur celle du super-admin.

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

**Limites** : vérifiées côté serveur, sous un verrou par organisation (`lib/server/org-lock.ts`) pour que deux requêtes simultanées ne dépassent pas ensemble : quiz, membres (invitations, acceptation, réactivation), médias ; joueurs fixés au lancement de la partie, puis plafonnés à la limite du moment (`toRoom()` dans `lib/server/game.ts` ; à l'entrée d'un joueur, `joinRoom()` relit cette limite une fois le verrou de la partie obtenu) : à la fin d’un Pack Événement ou d’une offre, une partie déjà lancée ne prend plus de nouveaux joueurs au-delà de la limite retrouvée, ceux déjà entrés restent. Après un passage à une offre inférieure, les contenus existants sont conservés, seule la création est bloquée.

**Paiement (Stripe)** : `lib/server/billing.ts`. Page « Abonnement » de l'espace (`/app/abonnement`, administrateurs) : souscription par Stripe Checkout, changement d'offre au prorata, arrêt/reprise (fin de période), portail Stripe pour factures et carte. L'offre choisie sur la page Tarifs avant l'inscription est gardée avec l'organisation (`Organization.wantedOffer`) : la première connexion ouvre l'espace sur la page Abonnement, qui part aussitôt vers la page de paiement Stripe de cette offre ; la demande de paiement efface la valeur, donc cela n'arrive qu'une fois. Si l'offre ne peut pas être achetée telle quelle (partenaire, paiement hors ligne, abonnement déjà en cours), elle est seulement mise en avant, puis effacée. Le webhook `/api/billing/webhook` synchronise l'offre ; à la fin d'un abonnement l'organisation repasse seule sur Gratuit. Produits Stripe dans `lib/plans.ts` (`prod_…` : leur prix par défaut est facturé). Actif seulement si `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont dans `/opt/squizz-secrets.env` ; sinon, souscription par le formulaire de contact et activation à la main dans le super-admin.

**Garanties de facturation** (`lib/server/billing.ts`) :

- *Monitoring.* Page « Monitoring » du super-admin (`/super-admin/monitoring`) : alertes (`SystemAlert`) et exécutions des tâches de nuit (`CronRun`). `reportAlert()` (`lib/server/monitoring.ts`) enregistre les erreurs serveur inattendues (`route()`, API de jeu `/api/game` avec son action, import de médias, webhook), les erreurs d'affichage (`instrumentation.ts`, `onRequestError`), les pages plantées dans le navigateur (`app/error.tsx` → `POST /api/monitoring`, limité par adresse), les e-mails non partis et les anomalies de facturation ; un e-mail part vers `ALERT_EMAIL` (à défaut contact@pressweb.fr), au plus un par type et par demi-heure. Les chemins gardés sont nettoyés (pas de jeton ni de paramètres). La sauvegarde et la purge écrivent chacune leur exécution ; le contrôle de santé écrit une alerte quand il échoue. Conservation : 90 jours (purge). Après une modification de `deploy/setup-server.sh`, relancer `bash deploy.sh --setup` pour mettre à jour les scripts du serveur. Scénario `monitoring`.
- *Pack Événement.* Paiement unique (`EVENT_PASS` dans `lib/plans.ts` : prix, durée, offre donnée), vendu par `buyEventPass()` sur une page Checkout en mode paiement — le prix de `lib/plans.ts` est envoyé avec la page et rattaché au produit Stripe du pack (`EVENT_PASS.stripe`, `prod_…`) : le montant payé est toujours celui affiché sur le site, quel que soit le prix par défaut du produit (ou `STRIPE_PRICE_EVENT_PASS` pour un prix configuré). Comme pour un abonnement, les demandes sont sérialisées par la réservation de l'organisation (`checkoutLockedUntil`) et l'opération garde une identité (`checkoutOpKey`, clé d'idempotence `squizz-pass-…`) et ses paramètres exacts (`checkoutOpParams`) jusqu'à ce que sa page existe : quatre clics simultanés ouvrent une seule page, un achat interrompu est repris, un nouvel achat après paiement ou expiration est une nouvelle opération. `applyEventPass()` l'accorde à réception de `checkout.session.completed` payé : une ligne `EventPass` par session Stripe (un paiement signalé deux fois compte une fois) et `Organization.eventPassUntil` repoussé de 7 jours. `orgLimits()` en tient compte partout. Au retour de la page de paiement, `reconcileEventPasses()` rattrape un webhook en retard. Scénario `event-pass`.
- *Un seul abonnement par organisation.* `subscribe()` prend une réservation persistante (`checkoutLockedUntil`, un `UPDATE` atomique, donc valable entre plusieurs processus) ; une seule page Checkout ouverte à la fois (`checkoutSessionId`/`checkoutPlan` : la même page est renvoyée pour la même offre, la précédente est expirée avant d'en créer une autre, expiration automatique au bout de 30 min) ; avant toute vente, l'état réel chez Stripe est relu (abonnement déjà payé dont le webhook est en retard ou perdu : il est adopté). Côté webhook, le premier abonnement enregistré gagne (écriture atomique) ; un second abonnement actif est annulé et Pressweb est prévenu par e-mail pour vérifier un éventuel remboursement.
- *Reprise à l'identique.* `openCheckoutPage()` écrit l'opération avant d'appeler Stripe : sa clé (`checkoutOpKey`) et les paramètres exacts envoyés (`checkoutOpParams`, expiration de la page comprise). Une reprise renvoie cette même demande, car Stripe refuse une clé d'idempotence dont les paramètres ont changé. Stripe répondant alors ce qu'il a répondu la première fois, la page est relue : si elle a expiré ou a été payée, ou si Stripe a mémorisé son propre échec, une nouvelle opération démarre avec une nouvelle clé. Un simple doute réseau ne change jamais la clé.
- *Plus de facturation après suppression.* `stopBillingForDeletion()` est appelé avant toute suppression d'organisation (compte du dernier membre, super-admin), sous la réservation de paiement de l'organisation (une page en cours de création est attendue, puis fermée ; la réservation est gardée jusqu'à la suppression, donc rien ne peut être vendu entre-temps) : pages Checkout ouvertes expirées, tous les abonnements non terminés du client annulés. Si Stripe ne confirme pas, rien n'est supprimé (erreur 502) et l'opération peut être relancée sans risque. Un abonnement qui arrive pour une organisation déjà supprimée (page payée trop tard) est annulé à réception du webhook. La purge automatique ne supprime jamais une organisation connue de Stripe.
- Événements du webhook : ceux déjà listés, plus `checkout.session.expired` (facultatif : sans lui, l'état est de toute façon relu à la demande suivante).

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
- **Export / import** (`lib/server/quiz-transfer.ts`) : « Exporter » sur une carte télécharge un fichier `.squizz` (le quiz et les médias de l'organisation qu'il utilise, en base64 ; les liens externes et les illustrations des Originals restent des liens). « Importer » crée un nouveau quiz à partir de ce fichier, avec les mêmes contrôles que l'éditeur et l'envoi de photo (format réel des fichiers, poids, quotas de quiz et de médias). Tout est vérifié avant d'enregistrer quoi que ce soit : un import refusé ne laisse ni quiz ni fichier. Le même plafond s'applique des deux côtés (`lib/quiz-file.ts`) : 14 Mo de médias par quiz, soit un fichier de 20 Mo au plus ; au-delà, l'export est refusé avec une explication.
- **Bibliothèque** : recherche par titre (sans tenir compte des accents), tri (dernière modification, titre, ancienneté), filtre « Mes quiz », durée estimée à partir des réglages réels (`lib/quiz-duration.ts`, indicative).

## Résultats des parties

`lib/report.ts` (calcul, texte des réponses, CSV) et `lib/server/reports.ts` (enregistrement, lecture). À chaque « Suivant » de l'animateur, `nextQuestion()` réécrit le rapport de la partie (`GameReport`, identifiant `code-création`) avec les questions déjà passées : une partie arrêtée en route garde ce qui a été joué, une partie terminée est marquée comme telle. Une erreur à cet endroit est signalée au monitoring sans jamais bloquer la partie.

- **Pages** : `/app/resultats` (toutes les parties de l'organisation) et `/app/resultats/[id]` (chiffres, classement, question par question, réponses de chaque joueur). Impression ou PDF par le navigateur (feuille de style `@media print` dans `app/styles/app.css`).
- **Export** : `GET /api/reports/[id]` renvoie un classeur Excel (`reportSheets()` écrit par `lib/xlsx.ts` : onglets Classement, Questions, Partie ; les cellules sont du texte ou des nombres, jamais des formules, quel que soit le pseudo). `DELETE` le supprime (animateur de la partie ou administrateur).
- **Réussite** : part de tous les joueurs de la partie qui ont bien répondu (sans réponse = faux).
- **Réponses anonymes** : une question d'avis marquée `anonymous` (`canBeAnonymous()` dans `lib/question.ts`) garde ses chiffres, mais chaque joueur n'y a que « Réponse anonyme » dans le rapport.
- **Conservation** : 12 mois (`deploy/purge.mjs`), annoncée dans la politique de confidentialité, les CGU et la FAQ. L'animateur est un lien vers son compte, vidé si le compte est supprimé (« un ancien membre »).

## Import depuis Excel ou CSV

Le bouton « Importer » de la bibliothèque accepte un `.squizz`, un `.xlsx` ou un `.csv`. Un tableur est lu **dans le navigateur** (`lib/sheet.ts` : CSV au séparateur deviné, première feuille d'un .xlsx dézippé avec `DecompressionStream`, CSV Windows-1252 reconnu), converti en étapes par `rowsToQuestions()` (`lib/sheet-import.ts`), puis enregistré par l'action `save` comme un quiz de l'éditeur : mêmes contrôles et mêmes quotas côté serveur.

- **Colonnes** : Type, Question, Réponse 1 à 6, Bonne réponse, Temps (s), Points, Explication ; en français ou en anglais, la ligne d'en-têtes est cherchée dans les 20 premières lignes (le modèle de tableur de Kahoot fonctionne tel quel).
- **Bonne réponse** : numéro, lettre ou texte de la réponse, plusieurs séparées par des virgules ; Vrai/Faux ; réponses acceptées séparées par `/` ; nombre à trouver pour un curseur.
- **Lignes refusées** : signalées après l'import avec leur numéro et la raison ; au-delà de 30 étapes, le reste est compté.
- **Modèle** : `GET /api/modele-import` (`importTemplate()`), un .xlsx écrit par `lib/xlsx.ts` (zip non compressé, en-tête en gras sur fond vert acide, figé).

## Réseau lent ou coupé

Toutes les actions ont un délai maximal (15 s ; 2 min pour l'import d'un média) et libèrent leur bouton avec un message clair. Quand la réponse se perd, le résultat est **incertain** (`UncertainError` dans `lib/client/api.ts`) :

- enregistrer, créer, dupliquer, lancer une partie portent une **clé anti-doublon** (`clientKey`) ou une version : ils sont renvoyés une fois automatiquement, sans risque de doublon ;
- répondre, lancer le quiz, passer à la suite : le jeu est relu ; si l'action a eu lieu, tout va bien, sinon un message invite à réessayer. Le serveur ignore une seconde réponse, un second lancement ou un second « suivant » pour la même étape.

## Comptes et sécurité

- **Vérification de l'adresse e-mail** à l'inscription : lien à usage unique valable 24 h (seul son empreinte est stockée), renvoi limité (3 par adresse et 10 par connexion et par heure, même réponse que le compte existe ou non). Tant que l'adresse n'est pas confirmée, la connexion est refusée avec un bouton « Renvoyer le lien ». Le message de bienvenue part après la confirmation. Une invitation acceptée ou une réinitialisation de mot de passe confirment aussi l'adresse. **Comptes existants** : marqués confirmés par la migration. **Super-admin** : jamais bloqué. Inscriptions jamais confirmées : supprimées après 7 jours par la purge.
- **Cookies** (`lib/consent.ts`, `components/site/cookie-consent.tsx`) : les cookies de SQuizz sont strictement nécessaires (pas de publicité). Deux services demandent un accord : la mesure d'audience Google Analytics, sur les pages publiques seulement (`components/site/analytics.tsx`, jamais en partie ni dans les espaces connectés), et les vidéos YouTube. Bandeau d'information à la première visite (refuser, personnaliser, accepter, avec la même visibilité), panneau « Gérer les cookies » (pied de page, menu du compte, politique de confidentialité), choix gardé 6 mois dans le cookie `sq_consent`. Les vidéos YouTube restent bloquées tant que l'accord n'est pas donné (pour une vidéo ou pour toutes). L'anti-robot Cloudflare ne se charge qu'à l'utilisation du formulaire de contact. Pas de bandeau sur les pages de jeu : l'accord se donne sur la vidéo.
- **Dernier administrateur** (`lib/server/members.ts`) : la vérification « il reste un autre administrateur actif » et la modification se font dans la même transaction, sous le verrou de l'organisation, pour les rétrogradations, désactivations et suppressions (page Équipe, suppression de son propre compte, route du super-admin). Les droits de l'auteur de l'action sont revérifiés sous le verrou.
- **Mots de passe** (`lib/server/passwords.ts`) : bcrypt appliqué à l'empreinte SHA-256 du mot de passe (préfixe `v2$`), pour que deux mots de passe de plus de 72 octets ne soient jamais confondus ; les anciens hachages restent acceptés et sont convertis à la connexion suivante.
- **Sessions révoquées** (`lib/server/session-check.ts`) : l'interrogation de l'écran de partie (une requête par seconde et par écran) vérifie que la session tient toujours, avec un cache borné de 5 secondes ; partout ailleurs la vérification est immédiate.
- **Formulaires** : toujours en POST (`tests/forms.spec.ts` le vérifie dans le code) ; les formulaires à mot de passe sont inactifs tant que la page n'est pas prête.
- **Tentatives de connexion** (`lib/login-throttle.ts`) : 8 échecs par adresse IP et par compte, 30 tentatives par adresse IP, 60 échecs par compte sur 15 minutes. Ce dernier seuil ne s'applique pas depuis une adresse où le propriétaire s'est déjà connecté (90 jours) : un tiers ne peut pas le bloquer sur ses appareils habituels, et « Mot de passe oublié » reste toujours possible.

## Tests

```sh
npm test                    # unitaires (Vitest) — bloquants au déploiement avec tsc et le lint
npm run test:e2e            # intégration sur une base jetable squizz_e2e et un serveur :5174
npm run test:browser        # seulement les parcours en vrai navigateur (Playwright, tests/browser)
```

Stripe n'est jamais appelé par les tests : `scripts/e2e.sh` lance un faux Stripe local (`tests/stripe_mock.py`, avec pannes et lenteurs injectables, et les règles d'idempotence de Stripe : première réponse rejouée telle quelle, refus d'une clé dont les paramètres ont changé) vers lequel l'application est dirigée par `STRIPE_API_BASE` — variable ignorée en production.

`scripts/e2e.sh` recrée la base locale `squizz_e2e` (refuse toute base non locale ou dont le nom ne finit pas par `_e2e`/`_test`), la migre, crée le super-admin de test, démarre un serveur de dev avec son propre dossier de build (`.next-e2e`), sans SMTP, Stripe ni Turnstile, puis lance les scénarios. `bash scripts/e2e.sh editing` n'en lance qu'un.

Intégration : `game-flow`, `rich-game-flow`, `game-live` (plafond de joueurs en concurrence, retrait d'un joueur, compte à rebours), `quiz-management`, `accounts` (rôles, offres, partenaires, super-admin), `rights` (export, suppression de compte), `security` (requêtes d'autres sites, pas de verrouillage, puzzle), `editing` (conflits, anti-doublons, duplication, actions de jeu répétées), `email-verification`, `transfer` (export/import), `admins` (dernier administrateur sous requêtes simultanées), `billing` (un seul abonnement, résiliation avant suppression, webhooks dans le désordre — faux Stripe), `contact`, `super-admin`, `timeout`. Les limites de débit sont multipliées par 100 hors production pour que les tests puissent créer de nombreux comptes.

**En vrai navigateur** (`tests/browser/*.pw.ts`, Playwright avec Chromium et WebKit, scénarios `browser` et `browser-prod` de `scripts/e2e.sh` — le second sur un build de production) : ce que les scénarios Python ne voient pas, puisqu'ils interrogent le serveur sans navigateur. Sur une nouvelle machine, installer une fois les navigateurs : `npx playwright install chromium webkit`.

- `achat` : offre choisie sur la page Tarifs, création du compte, connexion, arrivée directe sur la page de paiement, puis retour sans second départ ; achat du Pack Événement jusqu'au pack actif ; portail Stripe. Les pages Stripe sont remplacées par une page vide servie avec un délai, et les rafraîchissements de la page sont coupés au moment du clic (`cutRefreshes`) : c'est la panne vue en production, où un rafraîchissement interrompu annulait le départ vers Stripe.
- `editeur` : répondre dans l'aperçu d'une question n'enregistre rien et ne quitte pas l'éditeur ; le bouton d'enregistrement fonctionne.
- `partie` : l'animateur lance une partie, un joueur la rejoint depuis un écran de téléphone, répond aux questions, podium des deux côtés.

Ils tournent sur le serveur de développement : le préchargement des pages, propre au site de production, n'est pas exercé.

**Intégration continue** (`.github/workflows/ci.yml`) : à chaque envoi sur `main`/`plateforme` et pour chaque pull request, types, lint, formatage et tests unitaires, puis les scénarios d'intégration et les parcours en navigateur sur un PostgreSQL jetable (traces Playwright gardées 7 jours en cas d'échec).

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
