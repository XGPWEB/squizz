# Journal du projet SQuizz

Ce qui a été fait, dans l’ordre, et pourquoi. Le détail technique de chaque étape est dans l’historique git (`git log`), l’exploitation dans le [README](README.md), l’audit dans [AUDIT-2026-09-30.md](AUDIT-2026-09-30.md).

**SQuizz** : quiz collectif en direct, en français, sur **www.squizz.fun**. Éditeur et responsable : Pressweb (Xavier Gerinette, contact@pressweb.fr).

## 29 septembre 2026 — De l’application au service en ligne

- **Reprise du code** généré par Sites : mise en forme (Prettier), découpage de l’API de jeu, modification et suppression de quiz, nettoyage du code mort.
- **Types de questions façon Kahoot** : 13 types (quiz, vrai/faux, réponse libre, curseur, pin’s, puzzle, sondage, échelle, NPS, place le pin’s, nuage de mots, question ouverte, brainstorming) et 6 mises en page de diapos, avec aperçus dans le choix des étapes. Menus déroulants corrigés.
- **Plateforme** : site vitrine, espace des organisations (bibliothèque de quiz, équipe, rôles administrateur/animateur), offres Gratuit (5 quiz, 20 joueurs, 3 membres, 100 Mo) et Pro (sur devis : illimité, 100 joueurs, 5 Go), super-admin Pressweb.
- **Pages légales** Pressweb (mentions, CGU, confidentialité) adaptées à SQuizz ; « Site conçu par Pressweb » avec lien.
- **Déploiement sur le VPS Hostinger** (Francfort) : utilisateur système `squizz`, PM2 dédié, Nginx + HTTPS, sans toucher aux autres projets du serveur ; DNS de squizz.fun basculé.
- **Contact « Parlons-en »** : formulaire avec Cloudflare Turnstile et piège à robots, messages dans le super-admin, envoi par le SMTP Resend de Pressweb.
- **Super-admin** : mon compte, « voir en tant qu’administrateur » d’une organisation, recherche d’utilisateurs.
- **Finitions** : e-mails aux couleurs de SQuizz, œil sur les champs mot de passe, favicon du logo, animations (apparitions, parallaxe, formes, bandeaux défilants), nouvelle barre de l’espace connecté.

## 30 septembre 2026 — Audit et remise à niveau

- **Audit complet par 6 agents** (sécurité, jeu, interface, serveur, RGPD, code), puis 5 lots de corrections :
  1. **Protéger** : sauvegardes quotidiennes vérifiées (base + médias), module rsync pour le NAS, contrôle de santé, alertes.
  2. **Charge et équité du jeu** : cache partagé, compte à rebours « Prêt ? » identique pour tous, plafond de joueurs fiable, retrait d’un joueur. Test : 100 téléphones, 20 ms de réponse médiane.
  3. **RGPD** : purge automatique (parties 24 h, journal 12 mois, contact 3 ans, médias inutilisés), export et suppression de son compte.
  4. **Sécurité applicative** : limitation des tentatives de connexion sans blocage de compte, contrôle d’origine, en-têtes de sécurité (CSP).
  5. **Qualité** : SEO de base, pages 404/erreur, ton (vous / tu), accessibilité, lint bloquant, tests unitaires, README d’exploitation.
- **Vignettes** des types de questions redessinées aux couleurs de SQuizz (plus rien de l’habillage Kahoot).
- **SEO et GEO** : page [/alternative-kahoot](https://www.squizz.fun/alternative-kahoot) (comparatif sourcé et daté avec Kahoot!, Mentimeter, Wooclap), FAQ, 6 avantages, données structurées pour Google, `/llms.txt` pour les assistants IA. Sitemap et robots.txt corrigés (ils contenaient l’adresse locale). Domaine validé dans Google Search Console.
- **Écrans joueur** épurés : logo animé, salle d’attente « C’est bon, Prénom ! », jeu sans l’en-tête du site.
- **Écran animateur** plein écran : tout tient sans défilement, chrono circulaire, réponses et classement dans des fenêtres animées, podium avec confettis. Évolution des places en pastilles ▲ ▼ =.
- **E-mails** : 12 modèles (bienvenue, invitation, nouveau membre, mot de passe oublié/modifié, accusé de contact, suppression, offre Pro/Gratuit, suspension, réactivation…), habillage aux codes du site (bandeau illustré, titre à sticker rose, carte verte, étapes en tuiles). Réponses toujours vers contact@pressweb.fr. Envois de test validés (Gmail et contact@pressweb.fr).
- **Éditeur** : création d’étape dans une fenêtre en 4 temps (type, contenu, réglages, aperçu), aperçu « téléphone » et « écran » de chaque question, explication facultative de la réponse (affichée avec la correction), photos optimisées automatiquement (1600 px, WebP, sans GPS ; limites 2 Mo photo, 5 Mo GIF, 20 Mo vidéo).
- **Super-admin** déplacé sur **/super-admin**, avec sa **propre connexion** (/super-admin/connexion) et sa propre session : on peut être connecté en même temps au super-admin et à un compte client personnel dans le même navigateur.
- **Serveur** : mises à jour Ubuntu (24.04.5, noyau 6.8.0-146) et redémarrage ; SQuizz repart seul.
- **GitHub** : dépôt privé [XGPWEB/squizz](https://github.com/XGPWEB/squizz), README détaillé, versions numérotées (CHANGELOG, étiquettes `v1.0.0`, `v1.1.0`).
- **Pied de page** réorganisé (logo et slogan, trois colonnes de liens, barre de crédit).
- **Quatre offres sans engagement** : Gratuit, Essentiel 15 €/mois, Pro 30 €/mois, Premium annuel 310 €/an ; page Tarifs refaite, CGU mises à jour, bouton « Arrêter mon abonnement » dans l’espace client. Souscription par message, activation et facture à la main depuis le super-admin.
- **Paiement Stripe** (page « Abonnement », webhook), **statut partenaire** (Premium offert) depuis le super-admin, couleurs par offre, limites verrouillées contre les requêtes simultanées.

## 1er octobre 2026 — Confort d’édition et fiabilité (non publié)

- **Éditeur** : brouillons gardés automatiquement sur l’appareil (par compte et par quiz) et proposés après un rechargement ; état « Brouillon gardé… / Tout est enregistré » ; alerte avant de quitter ; dupliquer une étape et annuler une suppression.
- **Travail à plusieurs** : si un collègue enregistre le même quiz entre-temps, rien n’est écrasé ; une fenêtre propose d’enregistrer sa version comme nouveau quiz, de remplacer, ou de reprendre l’autre version.
- **Bibliothèque** : recherche, tri, filtre « Mes quiz », durée estimée réaliste ; dupliquer un quiz, copier un SQuizz Original pour le modifier.
- **Connexion instable** : plus de bouton bloqué ni de double création ; une réponse, un lancement ou un « question suivante » perdus en route sont vérifiés auprès du serveur.
- **Sécurité** : confirmation de l’adresse e-mail à l’inscription (les comptes existants ne sont pas concernés) ; un tiers ne peut plus bloquer un compte à coups de mauvais mots de passe.
- **Qualité** : base de test jetable, intégration continue GitHub, nouveaux tests.

## Reste à faire

- **Publier la version « Non publié »** (brouillons, conflits, vérification e-mail…) : migration de base incluse, les comptes existants restent connectables.

- **Search Console** : vérifier vers le 3 octobre que Google a lu `sitemap.xml` (il ne l’avait encore jamais demandé) ; importer le site dans **Bing Webmaster Tools**.
- **Compte client personnel** à créer avec une autre adresse que contact@pressweb.fr.
- **NAS** : ajouter la récupération du module rsync `squizz-backups`.
- **Mentions légales** : adresse postale complète de Pressweb.
- **Stripe** : ajouter la clé secrète et le secret du webhook sur le serveur, configurer le webhook, le portail client et le pied de facture (TVA non applicable), puis redéployer. Prévenir les abonnés Premium 1 à 3 mois avant la reconduction (promis dans les CGU).
- Facultatif : changer la clé secrète Turnstile ; revoir les chiffres du comparatif concurrents de temps en temps.
