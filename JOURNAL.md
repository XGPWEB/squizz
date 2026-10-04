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

## 1er octobre 2026 — Confort d’édition et fiabilité (version 1.4.0)

- **Éditeur** : brouillons gardés automatiquement sur l’appareil (par compte et par quiz) et proposés après un rechargement ; état « Brouillon gardé… / Tout est enregistré » ; alerte avant de quitter ; dupliquer une étape et annuler une suppression.
- **Travail à plusieurs** : si un collègue enregistre le même quiz entre-temps, rien n’est écrasé ; une fenêtre propose d’enregistrer sa version comme nouveau quiz, de remplacer, ou de reprendre l’autre version.
- **Bibliothèque** : recherche, tri, filtre « Mes quiz », durée estimée réaliste ; dupliquer un quiz, copier un SQuizz Original pour le modifier.
- **Connexion instable** : plus de bouton bloqué ni de double création ; une réponse, un lancement ou un « question suivante » perdus en route sont vérifiés auprès du serveur.
- **Sécurité** : confirmation de l’adresse e-mail à l’inscription (les comptes existants ne sont pas concernés) ; un tiers ne peut plus bloquer un compte à coups de mauvais mots de passe.
- **Qualité** : base de test jetable, intégration continue GitHub, nouveaux tests.
- **Contenus** : SQuizz Original « Manager dans la fonction publique territoriale » ; export et import de quiz (fichier `.squizz` avec ses images) ; quiz « Connais-tu Nogent-sur-Marne ? » livré à Pôle jeunesse par import.
- **Cookies** : bandeau d’information et panneau de choix, vidéos YouTube soumises à accord, anti-robot chargé seulement à l’utilisation du formulaire de contact.

## 1er octobre 2026 — Corrections après audit (version 1.8.1)

- **Abonnements** : supprimer une organisation annule d’abord son abonnement Stripe ; une organisation ne peut plus se retrouver avec deux abonnements (double clic, deux onglets, webhook en retard).
- **Droits** : une organisation garde toujours un administrateur actif, même si deux administrateurs se rétrogradent au même instant.
- **Tests** : un faux Stripe local permet de tester la facturation sans aucun paiement réel.

## 1er octobre 2026 — Corrections de l’audit approfondi (version 1.8.2)

- **Mots de passe** : jamais dans l’adresse de la page, même si la page n’a pas fini de charger ; les mots de passe très longs ne sont plus confondus.
- **Paiement** : après une panne au mauvais moment, on retrouve la même page de paiement, jamais deux.
- **Export / import** : les images ne se mélangent plus, un import refusé ne laisse aucune trace, et tout quiz exporté peut être réimporté.
- **Sessions** : après un changement de mot de passe, une désactivation ou une suspension, l’ancien écran de partie perd la main en 5 secondes au plus.
- **Téléphone** : onglets nommés pour les lecteurs d’écran, état de l’enregistrement visible dans l’éditeur.

## 1er et 2 octobre 2026 — Versions 1.8.3 à 1.10.12

Nuage de mots, blind test, Pack Événement, page Monitoring du super-admin, parcours d’achat depuis la page Tarifs : le détail de ces versions est dans le [CHANGELOG](CHANGELOG.md).

## 3 et 4 octobre 2026 — Référencement, haut de page, session super-admin, tests (versions 1.10.13 et 1.10.14)

- **Référencement** : trois jours après la mise en ligne, Search Console affiche encore « Traitement des données en cours ». Rien ne bloque côté site (pages en 200, pas de `noindex`, sitemap lu par Google depuis le 30 septembre) : c’est le délai normal d’un domaine neuf sans lien entrant. Un lien vers squizz.fun a été ajouté sur la page d’accueil de pressweb.fr (carte « Application SQuizz » des réalisations), et les cartes SQuizz et Barber Q PRO y ont été corrigées (étiquettes, titre, texte alternatif).
- **Bouton « haut de page »** (1.10.13) sur les pages publiques : une pastille dans la charte, qui se remplit de rose au fil de la lecture, s’anime au survol et ramène en haut en un clic. Sur les largeurs intermédiaires (tablette en portrait, fenêtre réduite), elle recouvre la fin du crédit « Site conçu par Pressweb » tout en bas de page : laissé tel quel, à la demande de Xavier.
- **Session du super-admin** (1.10.14) : 30 jours sans activité au lieu de 12 heures, mot de passe redemandé au plus tard après 90 jours au lieu de 7. La politique de confidentialité indique la nouvelle durée du cookie.
- **Tests en vrai navigateur** : WebKit (le moteur de Safari) en plus de Chromium, et un nouveau scénario `browser-prod` qui rejoue les parcours de paiement sur un build de production. Le build de production demande aux navigateurs de tout charger en https ; WebKit l’applique aussi à `localhost`, où le serveur de test est en http : cette seule consigne est retirée pour lui dans les tests.
- **Intégration continue** : elle installe WebKit, garde les traces Playwright d’un échec (elles n’étaient en réalité jamais envoyées) et dure environ 11 minutes au lieu de 9. Le scénario `billing` n’échoue plus sur une machine lente (il attendait un délai fixe).

## 4 octobre 2026 — Saisie avant le chargement, plein écran, partie en famille (versions 1.10.15 à 1.10.21)

- **Saisie perdue avant la fin du chargement** : la trace d’un test qui échouait par intermittence sous WebKit a montré un vrai défaut. Ce qui est tapé avant que la page soit active reste affiché, mais la page ne le reçoit pas, puis le remet à sa valeur de départ. Dans l’**éditeur** (1.10.15), les champs ne s’ouvrent qu’une fois l’éditeur prêt. Sur **« Rejoindre une partie »**, une première correction (1.10.17) lisait les champs à l’envoi : elle arrivait trop tard, les champs étaient déjà vidés et l’envoi était bloqué sans message. La 1.10.18 laisse les deux champs au navigateur, et un test rejoue le cas avec des scripts retardés. Leçon retenue : reproduire le défaut avant de livrer une correction déduite d’un test intermittent. Les autres formulaires (inscription, contact, compte, équipe) n’ont pas été passés en revue.
- **Plein écran pour l’animateur** (1.10.16) : un bouton en haut à droite de l’écran projeté masque les barres du navigateur, de la salle d’attente au podium. Absent sur iPhone, où le navigateur ne sait pas le faire.
- **Organisations vides dans le super-admin** (1.10.19) : créer une organisation pour une adresse qui a déjà un compte affichait une erreur mais laissait une organisation à 0 membre ; trois « Famille » se sont ainsi retrouvées dans la liste. L’adresse est maintenant vérifiée avant toute création. Les organisations vides déjà créées se suppriment à la main.
- **Après une partie jouée en famille** (1.10.20) : sur le téléphone de chaque joueur, après chaque question, l’écran remonte sur sa place et un message selon sa position (en tête, dauphin, podium, en embuscade, dernier). Sur l’écran de l’animateur, l’image d’une question occupe la place disponible au lieu d’une petite vignette, les questions à pin’s sont centrées, et la diapo « Grande image » n’est plus rognée. Vérifié sur des captures du quiz rejoué en local avec trois téléphones simulés, pas sur de vrais appareils.
- **Accueil** (1.10.21) : le carré bleu et le point d’interrogation, plus gros et plus écartés, dépassent nettement de la carte « T’es dans la partie ? », à laquelle ils sont maintenant accrochés. Un premier essai, posés par-dessus la carte, n’a pas été retenu.
- **Quiz de la tribu** : un jeu de 15 questions pour la famille de Xavier (fichier `exports/sous-le-meme-toit.squizz`, hors dépôt), avec des portraits dessinés d’après une photo. Deux pistes d’illustrations pour le site (photos détourées en parallaxe, puis personnages dessinés) ont été proposées en maquette et mises de côté.
- **Référencement** : Google a confirmé par e-mail, le 4 octobre, que des pages de squizz.fun apparaissent dans ses résultats depuis le 30 septembre.
- **Intégration continue** : verte sur `main` et `plateforme` pour la 1.10.21.

## Reste à faire

- Stripe : ajouter l’événement `checkout.session.expired` au webhook (facultatif).


- **Search Console** : regarder les rapports Performances (requêtes, positions) et Pages dès qu’ils affichent des données ; demander l’indexation de la page d’accueil de pressweb.fr pour que Google y découvre le lien ; importer le site dans **Bing Webmaster Tools**.
- **Formulaires** : vérifier que l’inscription, le contact, le compte et l’équipe ne perdent pas ce qui est tapé avant la fin du chargement (défaut corrigé dans l’éditeur et sur « Rejoindre une partie »).
- **Super-admin** : supprimer les deux organisations « Famille » à 0 membre.
- **Quiz de la tribu** : ajouter une question sur Noah, dès que ses passions sont connues.
- **Compte client personnel** à créer avec une autre adresse que contact@pressweb.fr.
- **NAS** : ajouter la récupération du module rsync `squizz-backups`.
- **Mentions légales** : adresse postale complète de Pressweb.
- **Stripe** : ajouter la clé secrète et le secret du webhook sur le serveur, configurer le webhook, le portail client et le pied de facture (TVA non applicable), puis redéployer. Prévenir les abonnés Premium 1 à 3 mois avant la reconduction (promis dans les CGU).
- Facultatif : changer la clé secrète Turnstile ; revoir les chiffres du comparatif concurrents de temps en temps.
