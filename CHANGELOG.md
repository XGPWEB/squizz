# Changelog

Toutes les évolutions notables de SQuizz. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), numérotation [SemVer](https://semver.org/lang/fr/). Le récit détaillé est dans [JOURNAL.md](JOURNAL.md).

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

[1.2.2]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.2
[1.2.1]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.1
[1.2.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.2.0
[1.1.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.1.0
[1.0.0]: https://github.com/XGPWEB/squizz/releases/tag/v1.0.0
