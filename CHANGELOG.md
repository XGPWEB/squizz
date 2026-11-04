# Changelog

Toutes les évolutions notables de SQuizz. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), numérotation [SemVer](https://semver.org/lang/fr/). Le récit détaillé est dans [JOURNAL.md](JOURNAL.md).

## [1.30.1] — 2026-11-04

### Site public

- Le formulaire « Écrire un message » est ouvert dès l’arrivée sur l’accueil ; il peut toujours être replié.
- Sur téléphone, les rangées qui se font glisser (formats de questions, « Pour qui ? ») ont des flèches précédent / suivant, des points qui montrent la carte affichée et la mention « Glissez ». Elles défilent toutes seules toutes les 3,5 secondes quand elles sont à l’écran, s’arrêtent 8 secondes dès que le visiteur les touche, repartent au début après la dernière carte, et ne bougent pas avec « réduire les animations ». Rien ne change sur ordinateur.

## [1.30.0] — 2026-11-04

### Espace organisateur

- Nouvelle **notice d’utilisation** (/app/aide), ouverte depuis le menu à votre nom et depuis « Mes quiz » : neuf chapitres (premiers pas, créer un quiz, animer, faire jouer à distance, résultats, équipe, apparence, abonnement, compte), chacun en quelques étapes numérotées, avec le détail dans « En savoir plus ». Les boutons y sont écrits comme à l’écran, en étiquette ; les chapitres réservés aux administrateurs sont signalés. Sommaire collant sur ordinateur, à faire glisser sur téléphone.

## [1.29.0] — 2026-11-04

### Site public

- Accueil allégé : de 14 à 7 écrans sur téléphone, de 7 à 5,5 sur ordinateur. Six formats dessinés comme avant la 1.27, les autres nommés en une ligne ; les fonctions autour des questions, la moitié de la FAQ et le formulaire de contact passent dans des sections qui se déplient (barre crème, « + » qui pivote, ouverture avec un léger rebond, sans animation avec « réduire les animations »). Les avantages s’affichent en titres et s’ouvrent sur leur explication.
- Une seule bande d’inscription, un seul libellé (« Créer mon espace gratuit ») ; le bandeau défilant vert est retiré, les types ne défilent plus tout seuls.
- En haut de l’accueil, une phrase qui dit ce qu’est SQuizz et une ligne de prix (gratuit, dès 15 € / mois, Pack Événement 29 €).
- Sur téléphone, les formats et « Pour qui ? » se font glisser de côté ; les trois étapes tiennent en un écran ; les quatre liens du menu tiennent sur la ligne.
- Nouvelle page **/fonctionnalites** : chaque type de question et chaque fonction en clair, avec une ancre par type (« /fonctionnalites#blind-test »). Le menu et le pied de page y mènent.

### Référencement

- Titre de l’accueil « SQuizz : quiz interactif en direct, l’alternative française à Kahoot! », description raccourcie ; aperçus de partage propres à /tarifs et /alternative-kahoot.
- Tout le contenu replié reste dans la page servie (lu par Google et par les assistants IA). Titres dans l’ordre (plus de H4 sous un H2), « Un projet en tête ? » ne colle plus ses mots.
- Sitemap (avec /fonctionnalites) et llms.txt (Pack Événement, nouvelle page) à jour. Le paragraphe d’accroche s’affiche sans attendre l’animation.

## [1.28.0] — 2026-11-03

### Apparence

- Le logo de l’organisation s’affiche aussi avec le style SQuizz coloré : sur un autocollant blanc à côté du logo SQuizz, en haut du grand écran et des téléphones (plus grand dans la salle d’attente). Avec le style sobre, il remplace toujours celui de SQuizz.
- « Rejoindre une partie » ouverte par le QR code ou le lien d’invitation prend le style de la partie : avec le style sobre, vouvoiement (« À vous de jouer », « Votre pseudo »), logo de l’organisation et couleurs sobres. Un code tapé à la main garde la page SQuizz jusqu’à l’entrée dans la partie.
- L’écran Apparence passe en trois étapes : le style, le logo (actif dans les deux styles), la couleur et la mention « SQuizz » (style sobre). L’aperçu montre le logo dans les deux styles.

### Corrigé

- Apparence : un logo haut débordait de son cadre et recouvrait « Couleur principale » ; il tient maintenant dans le cadre, proportions gardées.
- Apparence : la case « Afficher « SQuizz » » prenait toute la largeur au-dessus de son texte ; elle est revenue à sa place, devant le texte.

## [1.27.2] — 2026-11-03

### Site public

- « Tout ce qu’il faut pour animer » sur téléphone : un accordéon à la place des onglets qui défilaient de côté. Les cinq moments restent visibles, celui qui est ouvert est en noir avec une flèche vers le haut, et ses fonctions s’affichent juste en dessous ; le moment touché reste à l’écran. Sur grand écran, rien ne change, sauf une flèche qui désigne le panneau ouvert.

## [1.27.1] — 2026-11-03

### Site public

- Accueil, types de questions : une seule scène au lieu de 24 cartes. Trois onglets (connaissances, avis, diapos), les types de l’onglet en pastilles et le type choisi affiché en grand avec sa description. La scène fait défiler les types toute seule quand elle est à l’écran, avec une barre de progression sur la pastille ; elle s’arrête au survol, au premier clic ou avec le bouton pause, et ne défile jamais avec « réduire les animations ». La diapo montre ses 6 mises en page.
- « Tout ce qu’il faut pour animer » : les cinq moments deviennent des onglets numérotés, un seul panneau ouvert à la fois (onglets horizontaux sur téléphone).
- Onglets au clavier (flèches, Début, Fin) ; tous les textes restent dans la page pour les moteurs de recherche.

### Corrigé

- Vignette de la roue : coordonnées arrondies, le serveur et le navigateur dessinent le même tracé.

## [1.27.0] — 2026-11-03

### Site public

- Accueil : la section « Fonctionnalités » montre désormais les 16 types de questions, la diapo (avec ses 6 mises en page) et la roue, rangés par famille (tester les connaissances, collecter des avis, diapos), chacun avec sa vignette et sa description. Pastilles de navigation en haut de section vers chaque famille et chaque moment.
- Nouvelle section « Tout ce qu’il faut pour animer », en cinq moments : créer (IA, import Excel ou CSV, modèles, médias), animer en direct (équipes, télécommande, questions du public, réponses anonymes), jouer à son rythme (autonomie, rejouer en différé, quiz à profils), après la partie (résultats 12 mois, export Excel et PDF), à votre image (style sobre, logo et couleur, mention « SQuizz » masquable, équipe).
- « Comment ça marche », bandeau défilant, FAQ (IA, équipes, autonomie, résultats), tarifs (fonctions incluses dans chaque offre), comparatif Kahoot! et `/llms.txt` mis à jour ; données structurées complétées.
- Une seule source pour ces textes (`lib/seo.ts`), alignée sur la liste des types de l’éditeur : un type ajouté sans description publique bloque la vérification des types.

## [1.26.3] — 2026-11-03

### Corrigé

- Navigation de l’espace : les onglets, notamment « Abonnement », ne sont plus coupés quand le nom de l’organisation, le badge partenaire et le compte prennent de la place. Barre plus compacte, retour à la ligne si nécessaire, nom de compte long contenu dans son bouton.
- Téléphone : tous les boutons du menu restent accessibles, sans défilement horizontal caché. Le menu du compte reste dans l’écran.
- Vérification : scénario navigateur sur onze largeurs, de 320 à 1920 pixels, dans les espaces organisation et super-admin, avec contrôle du menu du compte et de la touche Échap.

## [1.26.2] — 2026-11-03

### Corrigé

- Autonomie : le chrono passe à la correction même sans réponse, y compris pendant la marge réseau du serveur. Une coupure réseau termine la tentative avec un bouton pour réessayer, sans boucle de requêtes.
- Autonomie : les blind tests proposent leur extrait sans dévoiler sa légende ; un lien fermé ou expiré bloque aussi les participants déjà entrés. Les résultats déjà terminés restent consultables.
- Médias : la purge conserve les images, sons et logos référencés par les instantanés autonomes encore présents.
- Éditeur : une étape en cours de création rejoint le brouillon local et la protection de sortie ; elle peut être restaurée après rechargement, même avant son ajout au quiz. L’enregistrement demande de terminer ou d’abandonner cette étape.
- Questions du public : un refus conserve la saisie et son message d’erreur, sans annoncer un envoi réussi.
- IA : un échec de sauvegarde garde le quiz généré dans la fenêtre et permet de reprendre son enregistrement avec la même clé anti-doublon, sans nouvelle génération.
- Résultats : la réussite moyenne inclut les questions sans aucune réponse, dans la page et l’export Excel.
- Cookies : le bandeau ne recouvre plus les commandes d’un quiz autonome ou d’une télécommande ; l’accord YouTube reste demandé sur le lecteur.

## [1.26.1] — 2026-11-03

### Modifié

- Thème sobre : les joueurs sont vouvoyés sur leur téléphone (salle d’attente, consignes, résultat, classement, questions du public, autonomie), avec des messages plus neutres entre deux questions. Le thème SQuizz garde le tutoiement.
- Le lien « Modèle Excel » quitte la barre de la bibliothèque : il apparaît dans le compte rendu d’un import quand des lignes ont été ignorées.

## [1.26.0] — 2026-11-03

### Ajouté

- Modèles par usage : une nouvelle rubrique de la bibliothèque, filtrable par moment (Accueil, Réunion, Formation, Bilan d’équipe, Convivialité). Cinq modèles prêts à lancer ou à copier pour les adapter : « Bienvenue dans l’équipe », « Brise-glace de réunion », « Évaluation de fin de formation » (anonyme), « Rétrospective d’équipe » (anonyme) et « Spécial fin d’année ».

## [1.25.0] — 2026-11-03

### Ajouté

- Créer un quiz avec l’IA : depuis la bibliothèque, à partir d’un texte collé, d’un fichier texte ou d’un PDF (PDF avec Claude seulement). Choix du nombre de questions (5 à 20), des types (quiz, vrai ou faux, réponse libre, textes à trous, sondage, question ouverte) et du niveau. Le quiz s’ouvre dans l’éditeur, avec un bandeau invitant à le relire.
- L’organisation utilise son propre compte Claude ou ChatGPT : un administrateur colle la clé une fois ; elle est chiffrée (AES-256-GCM, clé du serveur hors de la base) et n’est plus jamais affichée, ni dans l’espace, ni dans le super-admin. Modèle modifiable (par défaut claude-opus-5-5 ou gpt-5). 40 générations par jour et par organisation.

### Données personnelles

- Politique de confidentialité : la clé chiffrée, et l’envoi du contenu soumis au fournisseur choisi par l’organisation, sous son propre contrat.

### Serveur

- Nginx : délai de 3 minutes pour `/api/ai/` (`bash deploy.sh --nginx`). Nouvelle variable `AI_KEY_SECRET` dans `/opt/squizz-secrets.env` ; sans elle, la génération reste désactivée.

## [1.24.0] — 2026-11-03

### Ajouté

- Lien en autonomie : depuis la bibliothèque (icône lien sur une carte), un lien et un QR code ouverts 24 heures, 7 ou 30 jours. Chacun joue seul, à son rythme : chrono par question, correction immédiate avec l’explication et les réponses du groupe, score final et rang parmi ceux qui ont terminé. La roue de tirage, qui demande un animateur, est retirée.
- Rejouer en différé : à la fin d’une partie, un bouton ouvre ce même quiz en autonomie pour 7 jours ; les téléphones des joueurs affichent « Rejouer à mon rythme ».
- Onglet Résultats : les liens en autonomie (participants, date de fin, copier, fermer) et leurs résultats, mis à jour à chaque participant qui termine.

### Données personnelles

- Les participations en autonomie (pseudo, réponses) sont supprimées le lendemain de la fermeture du lien ; leurs résultats suivent la règle des 12 mois. Politique de confidentialité mise à jour.

## [1.23.0] — 2026-11-03

### Ajouté

- Questions du public : l’animateur ouvre le mur (bouton « Questions » du grand écran ou télécommande). Sur leur téléphone, les participants posent leurs questions, avec leur pseudo ou anonymement, et votent pour celles des autres ; elles sont classées par votes.
- Modération au choix : chaque question attend d’être validée avant de s’afficher. L’animateur valide, masque ou marque « répondue », aussi depuis la télécommande.
- Les questions affichées sont gardées avec les résultats de la partie (sans les noms) et dans l’export Excel. Cinq questions au plus par participant, 280 caractères chacune.

## [1.22.0] — 2026-11-03

### Ajouté

- Télécommande : un bouton sur le grand écran affiche un QR code secret ; scanné avec le téléphone de l’animateur (sans se connecter), il permet de lancer le quiz, suivre les réponses et le chrono, arrêter une question avant la fin du temps, passer à la suite, lancer la roue, voir les réponses et le classement, retirer un joueur.
- Le secret passe après le « # » du lien (jamais dans les journaux du serveur) et n’ouvre que ces commandes, pour cette partie seulement.

## [1.21.1] — 2026-11-03

### Thème sobre

- Podium des équipes à la couleur de chaque équipe, comme leurs étiquettes.
- Appariement : une paire fausse sur fond rose pâle, plus sur le rose vif du thème coloré.

## [1.21.0] — 2026-11-03

### Ajouté

- Page « Apparence » (administrateurs) : style SQuizz coloré ou sobre pour les parties, logo de l’organisation, couleur principale (assombrie automatiquement si elle n’est pas lisible), mention « SQuizz » masquable sur les offres payantes. Aperçu en direct.
- Thème sobre des écrans de jeu : fond clair, filets fins, polices Inter et Inter Tight, logo de l’organisation, animations discrètes ; textes de fin neutres. Une partie garde l’apparence de son lancement.

### Corrigé

- Formulaire « Rejoindre une partie » : la mention de conservation annonçait encore 24 à 48 heures ; les résultats sont gardés 12 mois depuis la 1.15.0.

## [1.20.0] — 2026-11-03

### Ajouté

- Mode équipes : dans la salle d’attente, l’animateur choisit de 2 à 6 équipes aux couleurs de SQuizz (Éclairs, Citrons, Flamants, Mandarines, Corbeaux, Nuages). Chaque joueur choisit la sienne sur son téléphone, ou l’animateur les répartit au hasard ; au lancement, ceux qui n’ont pas choisi rejoignent les équipes les moins remplies.
- Score d’une équipe : la moyenne de ses joueurs, pour comparer des équipes de tailles différentes. Classement des équipes après chaque question (places gagnées ou perdues), podium des équipes à la fin, équipe et rang sur le téléphone de chaque joueur.
- Résultats et export Excel : l’équipe de chaque joueur et un classement des équipes.

## [1.19.0] — 2026-11-03

### Ajouté

- Étape « Roue de tirage au sort » (avec les diapos) : l’animateur lance la roue depuis le grand écran ; le serveur tire au sort et tous les écrans la voient tourner et s’arrêter sur la même entrée, même un téléphone qui arrive en cours de route. Elle contient les pseudos des joueurs, ou une liste de 2 à 30 entrées (gages, thèmes, équipes, lots…). Elle peut être relancée ; le joueur tiré au sort voit « C’est toi ! ».

## [1.18.0] — 2026-11-03

### Ajouté

- Type de question « Textes à trous » : les joueurs complètent un texte (jusqu’à 10 trous, plusieurs réponses acceptées par trou, sans tenir compte des majuscules ni des accents). Les mots à trouver ne quittent le serveur qu’à la correction ; le grand écran affiche le texte avec ses trous numérotés.
- Type de question « Appariement » : relier de 2 à 6 éléments à leur correspondance. Les correspondances sont mélangées par le serveur et présentées par ordre alphabétique ; le grand écran montre les deux colonnes.
- Pour les deux : correction détaillée (trou par trou, paire par paire), résultats et export Excel, import depuis le modèle Excel, vignettes dans le choix des types.

## [1.17.0] — 2026-11-03

### Ajouté

- Réponses anonymes : un réglage « Réponses » (avec le pseudo / anonymes) pour les questions d’avis (sondage, échelle, NPS, place le pin’s, nuage de mots, question ouverte, brainstorming). Le téléphone et le grand écran l’annoncent ; les résultats gardés n’en conservent que les chiffres et les réponses sans nom.
- Import Excel : colonne « Anonyme » (oui) dans le modèle.

## [1.16.0] — 2026-11-03

### Ajouté

- Import de questions depuis Excel (.xlsx) ou un fichier CSV, avec le bouton « Importer » de la bibliothèque : une question par ligne, tous les types sauf ceux qui demandent une image ou un extrait sonore. Le quiz prend le nom du fichier et s’ouvre ensuite dans l’éditeur pour y ajouter des médias.
- Modèle Excel à télécharger à côté du bouton, avec un exemple par type et un mode d’emploi.
- Le modèle de tableur de Kahoot est aussi compris (en-têtes en anglais, titre au-dessus du tableau).
- Après l’import, chaque ligne ignorée est signalée avec son numéro et la raison.

### Corrigé

- Barre de l’espace : les onglets ne débordent plus sur écran moyen (le nom de l’organisation se masque sous 1 100 px, les onglets passent en icônes sous 900 px, sauf l’onglet ouvert).

## [1.15.0] — 2026-11-03

### Ajouté

- Onglet « Résultats » dans l’espace : chaque partie de l’organisation garde son classement, ses chiffres question par question (réussite, réponses les plus données, moyenne, NPS) et les réponses de chaque joueur.
- Export Excel (classeur .xlsx : classement avec toutes les réponses, chiffres par question, fiche de la partie) et impression ou enregistrement en PDF, depuis la page d’une partie.
- Une partie arrêtée en route garde ce qui a été joué : les résultats sont enregistrés à chaque question passée.
- Bouton « Résultats détaillés » sur l’écran de fin de partie.
- Les résultats peuvent être supprimés par l’animateur de la partie ou un administrateur.

### Données personnelles

- Les résultats (pseudos, réponses, scores) sont gardés 12 mois puis supprimés automatiquement ; la partie elle-même reste effacée au bout de 24 heures. Politique de confidentialité, CGU et FAQ mises à jour.

## [1.14.6] — 2026-11-01

### Site

- Menu et pied de page : « Fonctionnalités », « Contact » et « Parlons-en » ramènent à leur section à chaque clic. Une fois l’ancre dans l’adresse, un nouveau clic ne faisait plus rien.
- « Fonctionnalités » ne coupe plus le haut du titre de la section à l’arrivée.

## [1.14.5] — 2026-11-01

### Super-admin

- Pastille sur l’onglet « Messages » : le nombre de messages de contact à traiter. Elle disparaît quand tout est traité.

## [1.14.4] — 2026-11-01

### Mesure d’audience

- Un visiteur qui a accepté n’est plus compté comme nouveau à chaque page : les cookies de mesure étaient effacés à chaque chargement, avant la lecture de son choix.

## [1.14.3] — 2026-11-01

### Super-admin

- « Trafic du site » : le compteur « en ligne » ne regarde plus que les 5 dernières minutes, au lieu des 30 de Google, qui comptaient des visiteurs déjà partis.

## [1.14.2] — 2026-11-01

### Super-admin

- « Trafic du site » : les quatre listes se rangent par deux sur grand écran, et l’une sous l’autre sur téléphone.

## [1.14.1] — 2026-11-01

### Super-admin

- « Trafic du site » : les listes des pages, sources, villes et appareils restent affichées quand elles sont vides, avec « Pas encore de données ».

## [1.14.0] — 2026-11-01

### Ajouté

- Super-admin : section « Trafic du site » sur la vue d’ensemble. Visiteurs, sessions et pages vues sur 7 jours avec l’évolution, visiteurs en ligne, pages les plus vues, sources, villes, appareils et conversions. Les chiffres viennent de Google Analytics 4 ; une lenteur ou une panne de Google ne bloque pas le tableau de bord.
- Mesure d’audience Google Analytics sur les pages publiques, uniquement avec l’accord du visiteur. Rien n’est mesuré en partie ni dans les espaces connectés, et les visites des administrateurs ne sont pas comptées. Reste éteinte tant que `NEXT_PUBLIC_GA_MEASUREMENT_ID` n’est pas renseigné.

### Confidentialité

- Bandeau cookies, panneau « Gérer les cookies » et politique de confidentialité mis à jour : « ni mesure d’audience » n’est plus vrai. Le choix de cookies est redemandé à tous les visiteurs.

## [1.13.3] — 2026-10-30

### Éditeur

- Fenêtre « Ajouter une étape » : la fermer (Échap, croix, clic à côté) ne perd plus rien. La rouvrir retrouve l’étape là où elle en était. Pour repartir de zéro, un bouton « Abandonner cette étape » demande confirmation.
- Changer le type d’une question garde tout ce que le nouveau type sait utiliser : réponses et bonne réponse entre quiz, sondage et puzzle, réponses acceptées, repère sur l’image, texte de diapo, explication. Si des réglages doivent être retirés, un message le dit et « Revenir au type précédent » les rend. Revenir au type d’avant les rend aussi.

### Partie

- Sondage : à l’affichage des réponses, aucune réponse n’est plus marquée comme bonne.

## [1.13.2] — 2026-10-30

### Ajouté

- Pressweb reçoit un e-mail à chaque nouvelle inscription, dès la création de l’espace : nom, adresse, nom de l’espace, offre choisie et lien vers l’organisation dans le super-admin. Répondre à ce message écrit directement à la personne inscrite. Les membres invités ne sont pas concernés : l’administrateur de leur organisation est déjà prévenu.

## [1.13.1] — 2026-10-06

### Partie

- Écran de l’animateur, nuage de mots : dans la fenêtre « Réponses », le nuage s’affiche en entier, sans barre de défilement. La fenêtre s’agrandit pour lui (jusqu’à 94 % de l’écran) et le nuage prend la hauteur disponible ; « Télécharger l’image », « Les plus cités » et « Question suivante » restent visibles en même temps.

## [1.13.0] — 2026-10-06

### Quiz à profils : un bilan du groupe, plus d’analyse individuelle

- Le quiz à profils dessine désormais le profil général du groupe : les réponses de tous les participants sont additionnées, et le profil du groupe est celui vers lequel elles pointent le plus souvent. Plus aucun profil n’est calculé par personne.
- Fin de partie, écran de l’animateur : « Le profil du groupe », avec la répartition des réponses par profil (nombre de réponses et pourcentage, total à 100 %).
- Fin de partie, téléphone : chacun voit le même résultat que l’animateur, le profil du groupe et sa répartition. L’encart « Ton profil » et le détail de ses propres réponses disparaissent.
- Pendant la partie et dans l’éditeur, les textes parlent du profil du groupe et non plus du profil de chacun.

## [1.12.2] — 2026-10-05

### Corrigé

- Un quiz créé par le super-admin en mode « voir en tant qu’administrateur » appartient à l’organisation visitée : ses administrateurs le voient et le gèrent, quel que soit le réglage de visibilité. Depuis la 1.12.0, un tel quiz laissé en brouillon privé restait attaché au compte super-admin : invisible pour l’organisation, tout en comptant dans son quota, et retrouvable seulement en repassant par ce mode.

## [1.12.1] — 2026-10-05

### Éditeur

- Médias par lien : le type se règle tout seul quand l’adresse collée le dit — YouTube, image (.jpg, .png, .webp, .gif…), vidéo (.mp4, .webm) ou son (.mp3, .m4a, .ogg). « Ajouter un lien » démarre en « Photo par lien » au lieu de YouTube, qui laissait une adresse d’image sans aperçu et refusait l’enregistrement (« Lien YouTube invalide »).
- Une image par lien qui ne s’affiche pas est expliquée dans l’éditeur : adresse d’une page au lieu de l’image, adresse en http://, site qui refuse l’affichage ailleurs.

### Partie

- Une image dont le lien ne répond plus est masquée, au lieu d’une icône d’image cassée.

## [1.12.0] — 2026-10-05

### Équipe : qui voit un quiz

- Chaque quiz a désormais un réglage « Qui voit ce quiz dans l’équipe ? », choisi par son auteur dans l’éditeur : **Brouillon privé** (lui seul le voit, le temps de le terminer), **Quelques personnes** (les membres cochés le voient, le modifient avec lui et peuvent le lancer) ou **Toute l’équipe** (comme avant : tous le voient et le lancent, l’auteur et les administrateurs le modifient).
- Un brouillon privé ou un quiz partagé à quelques personnes est invisible pour tous les autres membres, administrateurs compris : ni dans la bibliothèque, ni à l’ouverture, au lancement, à la copie ou à l’export.
- Seul l’auteur change ce réglage et supprime le quiz ; une personne avec qui il est partagé en modifie le contenu. La copie d’un quiz que tout le monde ne voit pas démarre en brouillon privé de la personne qui copie.
- Si le compte de l’auteur est supprimé ou désactivé, ses quiz reviennent aux administrateurs, pour qu’aucun ne reste hors d’atteinte.
- Bibliothèque : une étiquette « Brouillon privé » ou « Partagé avec N personnes » sur la carte du quiz. Les quiz existants restent visibles de toute l’équipe. Le réglage n’apparaît que si l’équipe compte d’autres membres.

### Éditeur

- Choix du format plus lisible : un bloc « Quel format de quiz ? » explique à quoi sert chaque format et ce qu’il contient, point par point (types de questions disponibles, points ou non, ce qui s’affiche à la fin), avec une étiquette « Format choisi » sur la carte retenue.

## [1.11.0] — 2026-10-05

### Quiz à profils (nouveau format)

- Un quiz peut désormais classer les participants par profil plutôt que par points : dans chaque sondage, chaque réponse pointe vers un profil (« Directif », « Participatif »…). Le profil d’une personne est celui vers lequel ses réponses pointent le plus souvent.
- Éditeur : choix du format en haut de page, « Quiz à points » ou « Quiz à profils ». En mode profils, un champ « Profil » apparaît en face de chaque réponse d’un sondage, avec les profils déjà nommés en suggestion ; la colonne de gauche liste les profils, le nombre de réponses rattachées, et permet de les renommer partout d’un coup.
- Format séparé : un quiz à profils ne contient aucune question à points (elles ne sont plus proposées, et l’enregistrement les refuse), de 2 à 6 profils. Sondages, échelles, nuages de mots, questions ouvertes et diapos restent disponibles.
- Partie : ni points, ni classement, ni podium. Après chaque question, le téléphone confirme simplement que la réponse est notée.
- Fin de partie, écran de l’animateur : « Le portrait du groupe », la répartition par profil en nombre de personnes et en pourcentage, sans aucun nom.
- Fin de partie, téléphone : chacun découvre son profil, visible de lui seul, avec le détail de ses réponses, puis la répartition du groupe. En cas d’égalité, les deux profils sont affichés et la personne compte dans chacun.
- Le profil associé à une réponse n’est jamais envoyé aux téléphones pendant la partie. Les profils suivent le quiz à l’export, à l’import et à la copie.

## [1.10.23] — 2026-10-05

### Éditeur

- Fenêtre « Ajouter une étape » : les trois familles d’étapes ont chacune leur bloc encadré, avec sa couleur, son pictogramme, une phrase d’explication et une étiquette — « Tester les connaissances » (points et classement), « Collecter des avis » (sans points ni classement), « Diapos multimédias » (sans réponse).
- Liste « Type de question » : les intertitres précisent la même différence.

## [1.10.22] — 2026-10-05

### Éditeur

- Fenêtre « Ajouter une étape » : Temps imparti, Points et Limite de réponse se règlent dans l’onglet Contenu, entre la question et les réponses, comme dans l’éditeur. L’onglet Réglages disparaît : la fenêtre passe à trois étapes, Type, Contenu, Aperçu.
- Diapos : le bloc de réglages vide (un trait suivi d’un espace blanc) n’est plus affiché.

## [1.10.21] — 2026-10-04

### Site

- Accueil : le carré bleu et le point d’interrogation se voient mieux autour de la carte « T’es dans la partie ? ». Plus gros et davantage écartés, ils restent derrière elle mais dépassent nettement, l’un au-dessus du coin en haut à droite, l’autre sous le coin en bas à droite, sur ordinateur comme sur téléphone.

## [1.10.20] — 2026-10-04

### Partie

- Sur le téléphone de chaque joueur, après chaque question, l’écran remonte sur son résultat : sa place (« #2 sur 5 ») et un message selon sa position — en tête, dauphin, sur le podium, en embuscade ou dernier (« la remontada commence maintenant »).
- Écran de l’animateur : l’image d’une question occupe la place disponible au lieu de rester une petite vignette ; plusieurs images s’affichent côte à côte.
- Questions à pin’s sur l’écran de l’animateur : l’image est centrée et ses repères tombent au bon endroit ; dans la fenêtre des résultats, elle tient en entier sans défilement.
- Diapo « Grande image » : l’image est montrée en entier, sur téléphone comme sur grand écran, avec son titre en dessous au lieu de la recouvrir.
- Sur téléphone, l’image d’une question prend moins de hauteur pour laisser les réponses en vue.

## [1.10.19] — 2026-10-04

### Corrigé

- Super-admin : créer une organisation pour une adresse e-mail qui a déjà un compte affichait bien une erreur, mais laissait dans la liste une organisation vide, à 0 membre ; chaque nouvel essai en ajoutait une. L’adresse est maintenant vérifiée avant toute création, et une création refusée ne laisse plus rien.

## [1.10.18] — 2026-10-04

### Corrigé

- Rejoindre une partie : la correction de la 1.10.17 ne suffisait pas. Le code et le pseudo tapés avant la fin du chargement étaient effacés au moment où la page devenait active, et « C’est parti ! » ne faisait alors plus rien, sans message. Les deux champs sont désormais laissés au navigateur : ce qui est tapé reste en place et part tel quel. Un test en vrai navigateur rejoue ce cas, scripts retardés.

## [1.10.17] — 2026-10-04

### Corrigé

- Rejoindre une partie : sur une connexion lente, un joueur qui tapait le code et son pseudo avant la fin du chargement de la page voyait sa demande refusée, comme si les champs étaient vides. Le code et le pseudo sont désormais lus tels qu’ils sont affichés au moment de l’envoi, et le bouton « C’est parti ! » attend que la page soit prête.

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
