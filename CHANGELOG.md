# Changelog

Toutes les évolutions notables de SQuizz. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), numérotation [SemVer](https://semver.org/lang/fr/). Le récit détaillé est dans [JOURNAL.md](JOURNAL.md).

## [1.10.16] — 2026-10-04

### Animation
- Écran de l’animateur : un bouton « Plein écran », en haut à droite, fait disparaître les barres du navigateur (adresse, onglets) autour de l’écran projeté, de la salle d’attente au podium. « Quitter le plein écran » ou la touche Échap y mettent fin. Le bouton n’apparaît pas là où le navigateur ne sait pas le faire (iPhone).

## [1.10.15] — 2026-10-04

### Corrigé
- Éditeur de quiz : ce qui était tapé dans la toute première seconde après l’ouverture de la page (titre, question) restait affiché mais n’était pas pris en compte, puis disparaissait au changement suivant. Les champs ne s’ouvrent désormais à la saisie qu’une fois l’éditeur prêt : plus rien de ce qui est tapé n’est perdu.

## [1.10.14] — 2026-10-04

### Super-admin
- La session du super-admin reste ouverte 30 jours sans activité, au lieu de 12 heures : elle se prolonge à chaque utilisation. Le mot de passe est redemandé au plus tard 90 jours après la dernière connexion (7 jours jusqu’ici). La politique de confidentialité indique la nouvelle durée du cookie.

## [1.10.13] — 2026-10-03

### Site
- Pages publiques : un bouton rond « haut de page » apparaît en bas à droite dès qu’on a fait défiler environ un écran. Il se remplit de rose à mesure qu’on avance dans la page, s’anime au survol avec l’étiquette « HOP, EN HAUT ! » et ramène en haut de la page en un clic. Les visiteurs qui demandent moins d’animations remontent sans effet de défilement.

## [1.10.12] — 2026-10-02

### Monitoring
- Un visiteur qui quitte une page avant qu’elle soit entièrement envoyée (onglet fermé, autre page ouverte) ne crée plus d’alerte « Erreur d’affichage : The destination stream closed early » ni d’e-mail : ce n’est pas une erreur du site.

## [1.10.11] — 2026-10-02

### Offres
- Après avoir choisi une offre sur la page Tarifs puis créé son compte, la première connexion envoie directement vers la page de paiement Stripe de cette offre (abonnement ou Pack Événement). Cela n’arrive qu’une fois : en revenant de Stripe (paiement annulé, bouton « précédent »), on retrouve la page Abonnement normale. Si l’offre ne peut pas être achetée telle quelle (organisation partenaire, paiement en ligne indisponible), la page Abonnement s’affiche avec l’offre mise en avant, comme avant.

## [1.10.10] — 2026-10-02

### Corrigé
- Page Abonnement : cliquer sur « Choisir… », « Acheter le pack » ou « Factures et moyen de paiement » ouvre bien la page Stripe. Jusqu’ici, la page se rafraîchissait juste après avoir demandé le départ vers Stripe ; ce rafraîchissement, interrompu par le départ, faisait recharger la page en cours et annulait le départ : le plus souvent, rien ne semblait se passer. Le serveur, lui, créait bien la page de paiement.
- Retour depuis Stripe avec le bouton « précédent » du navigateur : la page Abonnement est remise à jour et ses boutons sont de nouveau utilisables.

## [1.10.9] — 2026-10-02

Migration `20261002500000_wanted_offer` (appliquée par `deploy.sh`).

### Offres
- L’offre choisie sur la page Tarifs avant de créer un compte est retenue avec l’organisation : à la première connexion, l’espace s’ouvre directement sur la page Abonnement, l’offre choisie mise en avant et amenée à l’écran. Cela ne dépend plus du lien suivi après la confirmation par e-mail (autre appareil, bouton « Connexion », lien modifié par la messagerie).
- Page Abonnement : quand un paiement ne peut pas démarrer, la page remonte jusqu’au message d’erreur, qui restait hors de l’écran en haut de page.

## [1.10.8] — 2026-10-02

Migration `20261002400000_checkout_op_params` (appliquée par `deploy.sh`). Suite de la revue des corrections 1.10.7 (`REVIEW-1.10.7.md`).

### Corrigé
- Paiement (abonnement et Pack Événement) : une demande de paiement reprise après une panne renvoie à Stripe exactement la même demande que la première fois. Jusqu’ici, la date d’expiration de la page était recalculée à chaque essai, ce que Stripe refuse pour une demande déjà connue : la nouvelle tentative échouait. Si la page de la première tentative a expiré ou a été payée entre-temps, une nouvelle page est créée.
- Tests : le faux Stripe applique les règles réelles (même réponse pour une demande déjà connue, refus si elle a changé, durée minimale d’une page de paiement), et les scénarios panne → expiration → nouvelle tentative sont couverts pour le pack et l’abonnement.

## [1.10.7] — 2026-10-02

Corrections issues de l’audit approfondi du 2 octobre (`AUDIT-2026-10-02-APPROFONDI.md`).

### Corrigé
- Éditeur : répondre dans l’aperçu d’une question (texte, blind test, question ouverte, nuage de mots, idées) n’enregistre plus le quiz et ne fait plus quitter l’éditeur.
- Mot de passe oublié : si l’enregistrement du nouveau mot de passe échoue, le lien de réinitialisation reste utilisable (le lien et le mot de passe sont écrits ensemble).
- Monitoring : les erreurs inattendues de la bibliothèque de quiz et des parties (`/api/game`) apparaissent dans le super-admin, avec l’action concernée. Les refus ordinaires (partie pleine, code inconnu…) ne créent pas d’alerte.
- Parties : la limite de joueurs est relue au moment précis où un joueur entre ; des arrivées en attente au moment où un pack ou une offre prend fin n’entrent plus avec l’ancienne limite.
- Pack Événement : des demandes d’achat simultanées (double clic, plusieurs onglets) ouvrent une seule page de paiement ; un achat interrompu est repris au lieu d’être doublé. Racheter un pack après paiement reste possible.
- Suppression d’une organisation : une page de paiement en cours de création est attendue puis fermée avant la suppression ; aucune page payable ne reste chez Stripe.

## [1.10.6] — 2026-10-02

### Site
- Page « Créer un espace » : quand on arrive depuis un bouton d’offre de la page Tarifs, la ligne au-dessus du titre rappelle l’offre choisie et son prix (« OFFRE PRO · 30 € / MOIS · PAIEMENT APRÈS L’INSCRIPTION ») au lieu de « GRATUIT, SANS CARTE BANCAIRE ».

## [1.10.5] — 2026-10-02

### Site
- Page Tarifs : « Choisir Essentiel / Pro / Premium » et « Prendre le pack » mènent à la page « Créer un espace » (avec le lien « Se connecter » pour ceux qui ont déjà un compte) au lieu de la page de connexion. Une personne déjà connectée arrive directement sur sa page Abonnement.
- Page Abonnement : quand l’offre voulue n’est pas proposée parce que l’organisation a déjà autant (partenaire, ou Premium pour le Pack Événement), un message l’explique.

## [1.10.4] — 2026-10-02

### Site
- Page Tarifs : les boutons « Choisir Premium » et « Prendre le pack » sont blancs, comme ceux des autres offres (ils étaient verts sur fond vert).

## [1.10.3] — 2026-10-02

### Offres
- Une partie lancée pendant un Pack Événement (ou sous une offre plus large) n’accepte plus de nouveaux joueurs au-delà de la limite de l’organisation dès que le pack ou l’offre prend fin. Les joueurs déjà entrés continuent la partie.

## [1.10.2] — 2026-10-02

### Paiement
- Le Pack Événement est vendu sous son produit Stripe (`prod_VMugZ1ibhjTp4K`) : les ventes apparaissent sous ce produit dans Stripe. Le montant payé reste celui du site (29 €) et le pack s’arrête toujours seul au bout de 7 jours.

## [1.10.1] — 2026-10-02

### Référencement
- Les pages de connexion et d’inscription ouvertes depuis un bouton d’offre (« Choisir Pro », « Prendre le pack »…) ne sont plus explorées par les moteurs de recherche : liens marqués `nofollow` et adresses `?suite=` exclues dans `robots.txt`.

## [1.10.0] — 2026-10-02

Migration `20261002300000_monitoring` (appliquée par `deploy.sh`). Scripts du serveur à mettre à jour avec `bash deploy.sh --setup`.

### Monitoring
- Nouvelle page « Monitoring » dans le super-admin : alertes des 7, 30 ou 90 derniers jours, triées par type, et état des tâches de nuit (sauvegarde, purge) avec leurs 7 dernières exécutions.
- Sont enregistrés : les erreurs serveur inattendues, les pages qui plantent (côté serveur comme dans le navigateur), les e-mails qui ne partent pas, les anomalies de facturation et les échecs du contrôle de santé.
- Chaque type d’alerte est aussi envoyé par e-mail, au plus une fois par demi-heure. Aucun jeton ni paramètre d’adresse n’est gardé dans une alerte ; alertes et exécutions sont supprimées après 90 jours.

## [1.9.1] — 2026-10-02

### Super-admin
- La session ne se ferme plus au bout de 12 heures en plein travail : elle se prolonge tant que le super-admin est utilisé, et se ferme après 12 heures sans activité. Le mot de passe est redemandé au plus tard 7 jours après la dernière connexion.

## [1.9.0] — 2026-10-02

Migration `20261002200000_event_pass` (appliquée par `deploy.sh`).

### Blind test
- Nouveau type de question « Blind test » : un extrait (fichier MP3, M4A ou OGG jusqu’à 10 Mo, ou lien YouTube dont l’image reste masquée) est joué sur l’écran de l’animateur ; les joueurs écrivent le titre ou l’artiste sur leur téléphone. Jusqu’à 10 réponses acceptées, accents et majuscules ignorés.
- L’extrait, son lien et sa légende ne sont jamais envoyés aux joueurs avant la correction ; ils apparaissent ensuite avec la bonne réponse. Un lien YouTube peut indiquer où commencer (`t=43`).
- Les sons s’ajoutent aussi aux autres questions et aux diapos (import ou lien), et suivent l’export / import des quiz.

### Pack Événement
- Paiement unique de 29 €, sans abonnement : pendant 7 jours, l’espace a les limites de l’offre Premium (80 joueurs par partie). Rien n’est renouvelé ; ensuite l’espace retrouve son offre et ses quiz sont conservés. Un second pack ajoute 7 jours.
- Achat depuis la page « Abonnement » (administrateurs), présenté sur la page Tarifs ; e-mail de confirmation, badge « Pack Événement » dans l’espace, date de fin visible dans le super-admin.
- Un paiement n’est compté qu’une fois, même si Stripe le signale plusieurs fois ; si le signalement tarde, le pack est activé au retour de la page de paiement. Facture émise par Stripe.
- CGU complétées (pack, extraits sonores et droits de diffusion).

### Corrections
- Page d’accueil : le bandeau annonçait « jusqu’à 100 joueurs avec Pro » ; il reprend maintenant le vrai plafond (80 joueurs avec Premium).

## [1.8.6] — 2026-10-01

### Version affichée
- Le numéro de version apparaît en bas du site (à côté du copyright) et en bas de l’espace connecté et du super-admin. Il est lu dans `package.json` : il suit chaque changement de version, sans rien modifier d’autre.

## [1.8.5] — 2026-10-01

### Nuage de mots
- Mots plus serrés : les lignes sont presque empilées, accents et jambages frôlent le mot voisin, avec un petit écart sur les côtés pour que chaque mot reste lisible.
- Le nuage s’agrandit pour remplir son cadre, même avec peu de mots ou des mots courts.

## [1.8.4] — 2026-10-01

### Nuage de mots
- Retour à la disposition serrée d’origine (les mots peuvent se frôler, accents et jambages compris) ; le bouton « Télécharger l’image » reste au-dessus du nuage.

## [1.8.3] — 2026-10-01

### Nuage de mots
- Les mots ne se touchent plus : la place de chaque mot tient compte de ses accents et de ses jambages (« à », « é », « q », « g »), à l’écran comme dans l’image téléchargée.
- Le bouton « Télécharger l’image » est au-dessus du nuage, visible sans faire défiler la fenêtre des résultats.

## [1.8.2] — 2026-10-01

Migration `20261002100000_checkout_operation` (appliquée par `deploy.sh`).

### Corrections de l’audit approfondi
- Formulaires : tous les formulaires qui modifient quelque chose partent en POST, et les formulaires de connexion, d’inscription, d’invitation et de mot de passe attendent que la page soit prête — un mot de passe ne peut plus se retrouver dans l’adresse.
- Facturation : après une panne survenue juste après la création d’une page de paiement, la nouvelle tentative reprend la même page au lieu d’en ouvrir une seconde ; une demande ne peut plus libérer ni écraser la réservation d’une autre ; client Stripe retrouvé plutôt que recréé ; délai maximal sur les appels Stripe.
- Export / import : chaque image garde sa propre référence (plus d’images confondues) ; un import refusé ne laisse ni quiz, ni fichier, ni quota consommé ; un import relancé rend le quiz déjà créé même si le quota est atteint ; même plafond à l’export et à l’import (14 Mo de médias), avec un message clair.
- Mots de passe : deux mots de passe longs qui commencent pareil ne sont plus confondus (au-delà de 72 octets) ; les comptes existants sont convertis à leur prochaine connexion.
- Sessions : une session révoquée (mot de passe changé, membre désactivé, organisation suspendue) n’est plus reconnue comme animatrice par l’écran de partie, en 5 secondes au plus.
- Accessibilité : les onglets gardent un nom sur téléphone ; l’état de l’enregistrement reste visible sur téléphone dans l’éditeur.
- Dépendances de développement mises à jour (`npm audit` : 0 alerte).
- Tests : scénario `auth-hardening`, scénarios `billing` et `transfer` étendus, tests unitaires (mots de passe, sessions, références de médias, formulaires).

## [1.8.1] — 2026-10-01

### Corrections d’audit
- Facturation : une organisation supprimée n’est plus facturée (abonnement Stripe annulé et pages de paiement fermées avant la suppression ; en cas d’échec côté Stripe rien n’est supprimé et l’opération peut être relancée ; un abonnement arrivé après la suppression est annulé).
- Facturation : une organisation ne peut plus avoir plusieurs abonnements (réservation persistante, une seule page de paiement ouverte, abonnement existant chez Stripe adopté, doublon annulé par le webhook).
- Droits : le dernier administrateur actif ne peut plus disparaître sous des requêtes simultanées (vérification et modification dans la même transaction verrouillée, sur la page Équipe, à la suppression de son compte et dans le super-admin).
- Tests : faux Stripe local, scénarios `admins` et `billing`.

## [1.8.0] — 2026-10-01

### Nuage de mots
- Vrai nuage de mots : la taille de chaque mot est proportionnelle au nombre de fois où il a été cité, les mots sont placés sans chevauchement, aux couleurs de SQuizz ; rappel des mots les plus cités avec leur nombre.
- L’animateur peut télécharger le nuage en image (PNG de 2000 px, avec la question et le nombre de réponses).

## [1.7.0] — 2026-10-01

### Résultats
- Sondage : nombre de votes et pourcentage pour chaque choix, bloc de chiffres (réponses, participation, choix en tête), choix en tête mis en avant.
- Quiz, vrai/faux, échelle et NPS : pourcentage affiché à côté du nombre de votes ; taux de participation rappelé sous les résultats.

## [1.6.0] — 2026-10-01

### Cookies et consentement
- Bandeau d’information à la première visite (refuser, personnaliser ou accepter, à égalité), panneau « Gérer les cookies » accessible à tout moment, choix conservé 6 mois.
- Les vidéos YouTube des quiz ne se chargent qu’avec l’accord de la personne (pour une vidéo ou pour toutes).
- L’anti-robot Cloudflare n’est chargé que lorsque le formulaire de contact est utilisé.
- Politique de confidentialité mise à jour (liste des cookies, accord, durée).

## [1.5.0] — 2026-10-01

### Bibliothèque
- Exporter un quiz dans un fichier `.squizz` (quiz et images) et importer un tel fichier dans son espace, avec les mêmes contrôles que l’éditeur et les quotas de l’offre.

## [1.4.1] — 2026-10-01

### Contenu
- Nouveau SQuizz Original « Manager dans la fonction publique territoriale » : 10 questions de 7 types (choix, vrai/faux, curseur, puzzle, réponse libre, sondage, nuage de mots), corrections sourcées, 6 illustrations aux couleurs de SQuizz.

## [1.4.0] — 2026-10-01

### Éditeur
- Brouillons gardés automatiquement dans le navigateur (par compte et par quiz), proposés après un rechargement, effacés après l'enregistrement ; état de sauvegarde affiché et alerte avant de quitter.
- Conflits d'édition détectés côté serveur (version du quiz, contrôle atomique) : rien n'est écrasé, la personne choisit la version à garder.
- Dupliquer une étape, annuler sa suppression ; dupliquer un quiz, copier un SQuizz Original.

### Super-admin
- Offre « Partenaire (Premium offert) » au choix dès la création d’une organisation, et dans le menu d’offre de la liste (choisir une offre classique met fin au partenariat).

### Bibliothèque
- Recherche, tri par dernière modification, filtre « Mes quiz », durée estimée d'après les réglages des étapes.

### Réseau
- Délai maximal sur les actions, messages clairs, boutons toujours libérés ; clés anti-doublon pour enregistrer, dupliquer et lancer ; réponse, lancement et « suivant » vérifiés auprès du serveur quand le résultat est incertain, et sans effet s'ils sont reçus deux fois.

### Sécurité
- Vérification de l'adresse e-mail à l'inscription (lien unique de 24 h, renvoi limité) ; comptes existants et super-admin non concernés.
- Un tiers ne peut plus bloquer un compte en multipliant les mauvais mots de passe : le seuil par compte ne s'applique pas depuis les adresses où son propriétaire s'est déjà connecté.

### Qualité
- Base de test isolée (`scripts/e2e.sh`), intégration continue GitHub Actions, nouveaux tests (brouillons, conflits, duplication, actions répétées, vérification e-mail, limitation de connexion).
- Médias inutilisés et brouillons : 7 jours de grâce ; inscriptions non confirmées supprimées après 7 jours.

## [1.3.0] — 2026-09-30

### Paiement
- Paiement en ligne Stripe activé, sur un compte Stripe dédié à SQuizz (séparé de Barber Q PRO).
- Le webhook relit chaque abonnement chez Stripe : ordre des événements et version d’API indifférents.

## [1.2.2] — 2026-09-30

### Offres
- Premium annuel : 80 joueurs par partie (au lieu de 200).

## [1.2.1] — 2026-09-30

### Corrigé
- « Choisir … » sur Tarifs sans être connecté : l’offre choisie est gardée après la connexion ou l’inscription.

## [1.2.0] — 2026-09-30

### Abonnements
- Paiement en ligne Stripe : souscription par carte, changement d'offre au prorata, arrêt et reprise, factures et carte dans le portail Stripe, synchronisation automatique par webhook.
- Nouvelle page « Abonnement » dans l'espace client ; « Choisir … » sur Tarifs y mène, après connexion ou inscription.
- Statut partenaire (Premium offert), activable depuis le super-admin.
- Couleurs distinctes par offre : blanc, orange, bleu électrique, vert acide.
- Nouvelles limites : Gratuit 1 quiz / 5 joueurs / 1 animateur / 10 Mo ; Essentiel 5 / 15 / 2 / 250 Mo ; Pro 20 / 50 / 5 / 500 Mo ; Premium 50 / 200 / 10 / 1 Go.

### Sécurité
- Limites vérifiées sous verrou par organisation (plus de dépassement par requêtes simultanées) ; une invitation ne peut plus dépasser le nombre de membres après un passage à une offre inférieure.

### Légal
- CGU (paiement Stripe, prorata, partenaires) et confidentialité (Stripe sous-traitant) mises à jour.

## [1.1.0] — 2026-09-30

### Offres
- Quatre offres sans engagement : Gratuit (1 quiz, 5 joueurs, 1 animateur, 10 Mo), Essentiel à 15 € / mois (5 quiz, 15 joueurs, 2 animateurs, 250 Mo, support par e-mail), Pro à 30 € / mois (20 quiz, 50 joueurs, 5 animateurs, 500 Mo, support prioritaire) et Premium annuel à 310 € / an (50 quiz, 200 joueurs, 10 animateurs, 1 Go, support prioritaire).
- Nouvelle page Tarifs sur 4 colonnes, avec les questions fréquentes sur l'abonnement ; « Choisir … » pré-remplit le formulaire de contact.
- Bouton « Arrêter mon abonnement » (et « Reprendre ») sur la page Équipe, e-mails de confirmation à l'administrateur et à Pressweb, repère « Arrêt demandé » dans le super-admin.
- Super-admin : choix entre les 4 offres, revenu mensuel estimé des abonnements actifs.
- CGU : prix, reconduction, arrêt à tout moment, droit de rétractation de 14 jours.
- FAQ, comparatif, données structurées et `/llms.txt` mis à jour avec les 4 offres.

### Site
- Pied de page réorganisé : logo et slogan, trois colonnes de liens, barre de crédit.

## [1.0.0] — 2026-09-30

Première version publique, en ligne sur www.squizz.fun.

### Jeu
- 14 types de questions (quiz, vrai/faux, réponse libre, curseur, puzzle, sondage, échelle, NPS, place le pin's, nuage de mots, question ouverte, brainstorming…) et 6 mises en page de diapos.
- Partie en direct rejointe avec un code ou un QR code, sans compte joueur ; compte à rebours identique pour tous, plafond de joueurs, retrait d'un joueur.
- Écran animateur plein écran (chrono circulaire, classement animé, podium) et écrans joueur épurés.
- Explication facultative de la réponse, affichée avec la correction.

### Plateforme
- Site vitrine, tarifs, page « alternative à Kahoot » sourcée et datée, FAQ, `llms.txt`, sitemap, données structurées.
- Espace des organisations : bibliothèque de quiz, éditeur en 4 temps avec aperçus téléphone/écran, équipe et rôles (administrateur, animateur).
- Offres Gratuit et Pro attribuées depuis le super-admin.
- Super-admin sur `/super-admin`, avec sa propre connexion et sa propre session.
- Formulaire de contact avec Cloudflare Turnstile ; 12 modèles d'e-mails aux couleurs de SQuizz.
- Médias optimisés automatiquement (WebP 1600 px, sans GPS).

### Sécurité, RGPD, exploitation
- Limitation des tentatives de connexion, contrôle d'origine, en-têtes de sécurité (CSP).
- Purge automatique des données, export et suppression de compte.
- Déploiement avec sauvegarde de la base et retour automatique en cas d'échec ; sauvegardes quotidiennes vérifiées, contrôle de santé, alertes.

[1.8.1]: https://github.com/XGPWEB/squizz/releases/tag/v1.8.1
[1.8.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.8.0
[1.7.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.7.0
[1.6.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.6.0
[1.5.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.5.0
[1.4.1]: https://github.com/XGPWEB/squizz/releases/tag/v1.4.1
[1.4.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.4.0
[1.3.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.3.0
[1.2.2]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.2
[1.2.1]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.1
[1.2.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.0
[1.1.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.1.0
[1.0.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.0.0
