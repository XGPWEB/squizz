import { blindTest, choice, match, media, opinion, outro, puzzle, slide } from "./kit";

const m = media("blind-test");

export const blindTestClassique = [
  slide(
    "title",
    "Blind test : les grands classiques",
    "Montez le son ! Écoutez l’extrait, puis tapez votre réponse sur votre téléphone avant la fin du temps.",
    [m.img("couverture", "Un disque et un casque")],
  ),
  blindTest(
    "Quatre notes, et tout le monde la reconnaît. Qui a composé cette symphonie ?",
    m.audio(
      "extrait-1",
      "Symphonie n° 5, 1er mouvement · enregistrement du domaine public (Wikimedia Commons)",
    ),
    ["Beethoven", "Ludwig van Beethoven", "Van Beethoven"],
    "La Symphonie n° 5 en ut mineur de Ludwig van Beethoven, créée à Vienne en 1808. Ses quatre notes d’ouverture sont sans doute les plus célèbres de la musique classique.",
  ),
  blindTest(
    "Les oiseaux chantent, la nature s’éveille… Qui a composé ce concerto pour violon ?",
    m.audio("extrait-2", "« Le Printemps » · violon : John Harrison · CC BY-SA 4.0"),
    ["Vivaldi", "Antonio Vivaldi"],
    "« Le Printemps », premier des quatre concertos des Quatre Saisons d’Antonio Vivaldi, publiés à Amsterdam en 1725. Chaque concerto illustre un poème.",
  ),
  blindTest(
    "Qui a composé cette sérénade pour cordes ?",
    m.audio("extrait-3", "Sérénade n° 13, K. 525 · enregistrement du domaine public (Wikimedia Commons)"),
    ["Mozart", "Wolfgang Amadeus Mozart", "W. A. Mozart"],
    "Une petite musique de nuit (Eine kleine Nachtmusik), sérénade composée par Mozart à Vienne en 1787. Elle n’a été publiée qu’après sa mort.",
  ),
  choice(
    "De quel opéra cet air est-il tiré ?",
    ["Carmen", "La Traviata", "La Flûte enchantée", "Aida"],
    0,
    "La Habanera, « L’amour est un oiseau rebelle », chantée par Carmen à l’acte I de l’opéra de Georges Bizet, créé à l’Opéra-Comique en 1875.",
    { media: [m.audio("extrait-4", "Enregistrement du domaine public (Wikimedia Commons)")], duration: 30 },
  ),
  blindTest(
    "Ce morceau accélère sans cesse et vient de la musique de Peer Gynt. Qui l’a composé ?",
    m.audio("extrait-5", "« Dans l’antre du roi de la montagne » · Musopen · domaine public"),
    ["Grieg", "Edvard Grieg"],
    "« Dans l’antre du roi de la montagne », d’Edvard Grieg, écrit pour la pièce Peer Gynt d’Henrik Ibsen, créée à Christiania (Oslo) en 1876.",
  ),
  blindTest(
    "Quel est le titre de cette valse viennoise ? Indice : un fleuve s’y cache.",
    m.audio("extrait-6", "« Le Beau Danube bleu » · European Archive · CC0"),
    [
      "Le Beau Danube bleu",
      "Beau Danube bleu",
      "Le Danube bleu",
      "Danube bleu",
      "An der schönen blauen Donau",
      "The Blue Danube",
    ],
    "« Le Beau Danube bleu », valse de Johann Strauss fils (1867). Stanley Kubrick l’a rendue inoubliable dans 2001, l’Odyssée de l’espace.",
  ),
  blindTest(
    "Qui a composé ce galop, le plus célèbre des french cancans ?",
    m.audio("extrait-7", "« Galop infernal » · enregistrement du domaine public (Wikimedia Commons)"),
    ["Offenbach", "Jacques Offenbach"],
    "Le « Galop infernal » d’Orphée aux Enfers, opéra-bouffe de Jacques Offenbach créé à Paris en 1858. Les danseuses de cancan l’ont adopté pour toujours.",
  ),
  blindTest(
    "Quel est le titre de ce morceau pour piano ?",
    m.audio("extrait-8", "Piano : JMC Han · CC BY-SA 4.0"),
    ["La Lettre à Élise", "Lettre à Élise", "Für Elise", "Fur Elise", "Pour Élise"],
    "La Lettre à Élise (Für Elise), petite pièce de Beethoven composée vers 1810. Elle n’a été publiée qu’en 1867, quarante ans après la mort du compositeur.",
  ),
  match(
    "Reliez chaque compositeur à son pays de naissance (frontières actuelles).",
    [
      ["Vivaldi", "Italie"],
      ["Mozart", "Autriche"],
      ["Beethoven", "Allemagne"],
      ["Bizet", "France"],
      ["Grieg", "Norvège"],
    ],
    "Vivaldi est né à Venise, Mozart à Salzbourg, Beethoven à Bonn, Bizet à Paris et Grieg à Bergen.",
    { media: [m.img("partition", "Une partition")] },
  ),
  puzzle(
    "Classez ces compositeurs du plus ancien au plus récent, selon leur année de naissance.",
    ["Vivaldi", "Mozart", "Beethoven", "Bizet", "Grieg"],
    "Vivaldi (1678), Mozart (1756), Beethoven (1770), Bizet (1838), Grieg (1843).",
  ),
  opinion("wordcloud", "En un mot : qu’est-ce que la musique classique vous évoque ?"),
  outro(
    "Bravo, oreilles d’or !",
    "Ce blind test est un SQuizz Original. Créez le vôtre avec vos propres extraits audio ou des vidéos YouTube : l’image reste cachée jusqu’à la réponse.",
  ),
];
