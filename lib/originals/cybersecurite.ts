import { choice, match, media, opinion, outro, pin, slide, slider, trueFalse, typed } from "./kit";

const m = media("cybersecurite");

export const cybersecurite = [
  slide(
    "title",
    "Cybersécurité : déjouez les pièges",
    "Faux courriels, mots de passe, Wi-Fi public : dix situations du quotidien pour devenir le maillon fort de l’équipe.",
    [m.img("couverture", "Un bouclier et un cadenas")],
  ),
  pin(
    "Ce courriel semble venir des impôts, mais un détail trahit l’arnaque. Placez le pin’s dessus !",
    m.img("courriel", "Un courriel reçu ce matin"),
    { x: 0.6, y: 0.215, radius: 0.18 },
    "L’adresse de l’expéditeur : « impots-gouv.fr-dossier.com » n’est pas « impots.gouv.fr ». Le logo, la politesse et le montant précis sont faciles à copier. Les vrais services des impôts ne demandent jamais vos coordonnées bancaires par courriel.",
  ),
  choice(
    "Lequel de ces mots de passe est le plus robuste ?",
    ["P@ssw0rd2024!", "Marie1985", "cheval-agrafe-lune-bocal-74", "azerty123456"],
    2,
    "La longueur compte plus que les symboles : une phrase de passe de plusieurs mots au hasard est longue, difficile à deviner et facile à retenir. « P@ssw0rd » et ses variantes figurent dans toutes les listes testées par les pirates.",
    { duration: 30 },
  ),
  trueFalse(
    "Un site qui affiche un cadenas dans la barre d’adresse est forcément digne de confiance.",
    false,
    "Faux : le cadenas (https) garantit seulement que la connexion est chiffrée entre vous et le site. Il ne dit rien de l’honnêteté du site : la plupart des sites frauduleux en ont un.",
    { media: [m.img("cadenas", "Une barre d’adresse")] },
  ),
  choice(
    "Lesquels de ces réflexes protègent vraiment vos comptes ?",
    [
      "Activer la double authentification",
      "Utiliser un gestionnaire de mots de passe",
      "Installer les mises à jour dès qu’elles sont proposées",
      "Utiliser le même mot de passe partout, mais compliqué",
      "Noter ses mots de passe sur un post-it sous le clavier",
    ],
    [0, 1, 2],
    "Un mot de passe unique par compte limite les dégâts en cas de fuite, et le gestionnaire les retient pour vous. La double authentification bloque un pirate même s’il connaît le mot de passe.",
    { duration: 30, points: "double" },
  ),
  match(
    "Reliez chaque arnaque à sa définition.",
    [
      ["Hameçonnage", "Un faux message pour voler vos identifiants"],
      ["Rançongiciel", "Un logiciel qui chiffre vos fichiers contre rançon"],
      ["Arnaque au président", "Un faux dirigeant exige un virement urgent"],
      ["Faux support technique", "Une fausse alerte pousse à appeler un « technicien »"],
    ],
    "Toutes jouent sur l’urgence, la peur ou l’autorité. Le bon réflexe : prendre le temps de vérifier par un autre canal, par exemple en rappelant la personne au numéro habituel.",
    { duration: 60 },
  ),
  typed(
    "Quel site public aide les victimes de piratage et d’arnaques en ligne ? (son nom suffit)",
    [
      "cybermalveillance.gouv.fr",
      "cybermalveillance",
      "cybermalveillance.gouv",
      "www.cybermalveillance.gouv.fr",
    ],
    "Cybermalveillance.gouv.fr, le dispositif national d’assistance : diagnostic en ligne, conseils et mise en relation avec des professionnels près de chez vous. Pour signaler un courriel douteux, il y a aussi signal-spam.fr.",
  ),
  slider(
    "Selon la CNIL, combien de caractères doit compter au minimum un mot de passe utilisé seul, avec majuscules, minuscules, chiffres et caractères spéciaux ?",
    { min: 4, max: 24, target: 12, tolerance: 0, unit: "caractères" },
    "Au moins 12 caractères mêlant les quatre types (recommandation de la CNIL, 2022). Une phrase de passe plus longue, sans caractères spéciaux, fait aussi l’affaire.",
  ),
  choice(
    "Au café, vous devez consulter votre compte bancaire. La meilleure option ?",
    [
      "Le Wi-Fi gratuit du café",
      "Le partage de connexion de votre téléphone",
      "Le Wi-Fi ouvert du voisin, au signal plus fort",
      "Peu importe, tout est sécurisé aujourd’hui",
    ],
    1,
    "Sur un Wi-Fi public, n’importe qui peut créer un faux point d’accès au nom du café. La 4G ou la 5G de votre téléphone, protégée par votre opérateur, est bien plus sûre pour les opérations sensibles.",
    { media: [m.img("wifi", "Wi-Fi du café ou téléphone ?")] },
  ),
  opinion(
    "open",
    "Avez-vous déjà reçu un message d’arnaque ? Racontez-le en une phrase (vos réponses sont anonymes).",
    { anonymous: true },
  ),
  opinion("nps", "Recommanderiez-vous ce quiz à un collègue ?", {
    minLabel: "Pas du tout",
    maxLabel: "Sans hésiter",
  }),
  slide(
    "bullets",
    "Les 5 réflexes à retenir",
    "Activer la double authentification partout où c’est possible\nUn mot de passe unique par compte, rangé dans un gestionnaire\nInstaller les mises à jour sans attendre\nDans le doute, ne pas cliquer : vérifier par un autre canal\nUn incident ? Prévenir tout de suite, sans honte",
    [m.img("reflexes", "Mes réflexes")],
  ),
  outro(
    "Vous êtes le maillon fort !",
    "Ce quiz est un SQuizz Original, idéal pour une sensibilisation en équipe. Dupliquez-le pour y ajouter vos propres consignes, ou créez votre parcours de formation.",
  ),
];
