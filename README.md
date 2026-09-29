# SQuizz

Application de quiz collectif en français. Cible de domaine fournie : **www.squizz.fun**, chez Hostinger. Le type d’offre et l’accès au compte restent à préciser avant d’y déployer l’application. Aucun réglage DNS n’a été modifié.

## Fonctionnalités

- Charte inspirée du Hub : vert acide, bleu électrique, rose, crème, contours et ombres noirs, polices Anton et Permanent Marker servies localement.
- QR code généré localement dans la salle d’attente ; lien contenant le code de la partie et pseudo à saisir sur téléphone.
- Bilan individuel après chaque question : correction, points, rang, évolution ; égalités respectées.
- Podium final et total des bonnes réponses.
- Trois quiz de démonstration de cinq questions.
- Création, modification et suppression de quiz (1 à 30 questions, 14 types de question).
- Parties avec code à six chiffres et lien d’invitation, jusqu’à 100 joueurs.
- Animation des questions, 20 secondes par réponse et classement.
- Calcul des points côté serveur, réponse unique par joueur et question.
- Restauration d’une partie après rechargement grâce à son URL.

## Environnement actuel

React / Vinext, Worker Cloudflare et base D1. Cette version serveur ne s’installe pas par simple copie dans un dossier d’hébergement PHP. Pour un hébergement Hostinger, déterminer l’offre avant de choisir un portage Node/SQLite, PHP/MySQL ou un serveur séparé.

Les quiz sont rattachés à un cookie HttpOnly propre au navigateur. L’identité Sites (en-tête `oai-authenticated-user-id`) n’est prise en compte qu’en développement ou si la variable `TRUST_SITES_IDENTITY=true` est définie : ne l’activer que derrière le proxy Sites, sinon n’importe qui peut forger cet en-tête. La suppression de ce cookie fait perdre l’accès aux quiz créés anonymement. Les parties expirent après 24 heures et sont purgées à la création d’une nouvelle partie. Les imports de médias sont limités à 200 Mo et 30 fichiers par heure et par visiteur. La synchronisation interroge le serveur toutes les 900 ms ; la capacité annoncée de 100 joueurs est une limite applicative, pas un résultat de test de charge.

Un projet Sites privé a été enregistré pendant l’initialisation ; il n’a pas encore été publié. La politique d’accès Sites s’applique aux invitations si ce mode d’hébergement est retenu.

## Développement

Node.js 22.13 ou ultérieur. Formater avec `npm run format`.

```sh
npm ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_loving_makkari.sql
# puis de même pour 0001_kind_deathstrike.sql et 0002_chunky_excalibur.sql
npm run dev
```

N’appliquer chaque migration locale qu’une fois. Les migrations de production sont prises en charge par Sites dans ce mode de déploiement.

## Vérifications

```sh
npx tsc --noEmit
python3 tests/game-flow.py
node --experimental-strip-types tests/ranking.test.mjs
python3 tests/timeout.py
python3 tests/quiz-management.py
```

Le test fonctionnel utilise l’aperçu local sur `127.0.0.1:5173`. Il vérifie la validation et la propriété des quiz, les permissions de l’animateur, l’inscription, le masquage de la bonne réponse avant la révélation, les réponses en double, les points et la fin de partie.

## Essai sur téléphone

Lancer `npm run dev -- --hostname 0.0.0.0`, puis ouvrir sur l’ordinateur l’adresse Network imprimée par le serveur. Le QR code reprend cette origine : les téléphones sur le même Wi-Fi peuvent alors rejoindre la partie. Pendant cet aperçu réseau, les liens d’invitation remplacent automatiquement localhost ou 127.0.0.1 par l’adresse Wi-Fi détectée au démarrage. L’adresse réseau peut changer et l’accès dépend du pare-feu et de l’isolation des appareils Wi-Fi.

En production, le QR code utilise automatiquement l’origine réelle de la page. Le domaine squizz.fun n’est pas utilisé tant qu’il n’est pas raccordé à cette application.
