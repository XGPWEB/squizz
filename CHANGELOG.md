# Changelog

Toutes les évolutions notables de SQuizz. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), numérotation [SemVer](https://semver.org/lang/fr/). Le récit détaillé est dans [JOURNAL.md](JOURNAL.md).

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
