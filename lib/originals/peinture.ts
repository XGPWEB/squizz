import {
  choice,
  match,
  media,
  outro,
  pin,
  poll,
  puzzle,
  scale,
  slide,
  slider,
  trueFalse,
  typed,
} from "./kit";

const m = media("peinture");
const pd = "Wikimedia Commons · domaine public";

export const peinture = [
  slide(
    "title",
    "Chefs-d’œuvre : l’œil du connaisseur",
    "Dix questions pour visiter les plus grands musées du monde sans faire la queue.",
    [m.img("couverture", "Un chevalet, une palette et un pinceau")],
  ),
  choice(
    "La Joconde a été volée au Louvre en 1911. Combien de temps a-t-elle disparu ?",
    ["2 jours", "2 mois", "Plus de 2 ans", "20 ans"],
    2,
    "Volée le 21 août 1911 par Vincenzo Peruggia, un vitrier italien qui avait travaillé au Louvre, elle est retrouvée à Florence en décembre 1913. Ce vol l’a rendue mondialement célèbre.",
    { media: [m.img("tableau-1", pd)] },
  ),
  slider(
    "Quelle est la hauteur de la Joconde, cadre non compris ?",
    { min: 20, max: 200, target: 77, tolerance: 5, unit: "cm" },
    "77 cm sur 53 cm seulement, peinte sur un panneau de bois de peuplier. Beaucoup de visiteurs sont surpris par sa petite taille.",
  ),
  match(
    "Reliez chaque tableau à son peintre.",
    [
      ["La Nuit étoilée", "Vincent van Gogh"],
      ["La Jeune Fille à la perle", "Johannes Vermeer"],
      ["Le Cri", "Edvard Munch"],
      ["La Naissance de Vénus", "Sandro Botticelli"],
    ],
    "Van Gogh peint La Nuit étoilée en 1889, depuis sa chambre de l’asile de Saint-Rémy-de-Provence. Le Cri de Munch existe en plusieurs versions : celle-ci date de 1893.",
    {
      duration: 60,
      media: [
        m.img("tableau-2", `La Nuit étoilée · ${pd}`),
        m.img("tableau-3", `La Jeune Fille à la perle · ${pd}`),
        m.img("tableau-4", `Le Cri · ${pd}`),
        m.img("tableau-5", `La Naissance de Vénus · ${pd}`),
      ],
    },
  ),
  pin(
    "Dans Les Ménines (1656), Velázquez s’est peint lui-même, pinceau à la main. Placez le pin’s sur le peintre !",
    m.img("tableau-6", pd),
    { x: 0.245, y: 0.57, radius: 0.08 },
    "Velázquez se tient à gauche, devant une immense toile. Au fond, le miroir reflète le roi Philippe IV et la reine Marianne : ce sont peut-être eux qu’il est en train de peindre.",
  ),
  trueFalse(
    "Ce tableau de Claude Monet a donné son nom au mouvement impressionniste.",
    true,
    "Vrai : exposé en 1874, Impression, soleil levant inspire au critique Louis Leroy le mot moqueur d’« impressionnistes ». Les peintres l’adoptent fièrement.",
    { media: [m.img("tableau-7", `Musée Marmottan Monet · ${pd}`)] },
  ),
  choice(
    "Quel événement Eugène Delacroix peint-il dans La Liberté guidant le peuple ?",
    [
      "Les Trois Glorieuses de 1830",
      "La prise de la Bastille en 1789",
      "La révolution de 1848",
      "La Commune de Paris en 1871",
    ],
    0,
    "Les Trois Glorieuses, les 27, 28 et 29 juillet 1830, qui renversent Charles X. Delacroix peint la toile la même année ; elle est exposée au Salon de 1831.",
    { media: [m.img("tableau-8", pd)] },
  ),
  pin(
    "Dans cette estampe japonaise, une montagne sacrée se cache derrière les vagues. Trouvez-la !",
    m.img("tableau-9", pd),
    { x: 0.64, y: 0.68, radius: 0.06 },
    "Le mont Fuji, tout petit, au centre : la vague géante semble prête à l’engloutir. Ce jeu de perspective a fasciné les peintres européens.",
  ),
  typed(
    "Qui a gravé cette Grande Vague de Kanagawa, vers 1830 ?",
    ["Hokusai", "Katsushika Hokusai"],
    "Katsushika Hokusai, pour sa série des Trente-six vues du mont Fuji. Monet, Van Gogh ou Debussy comptaient parmi ses admirateurs.",
  ),
  puzzle(
    "Classez ces tableaux du plus ancien au plus récent.",
    ["La Naissance de Vénus", "La Joconde", "Les Ménines", "La Liberté guidant le peuple", "La Nuit étoilée"],
    "Botticelli vers 1485, Léonard de Vinci à partir de 1503, Velázquez en 1656, Delacroix en 1830 et Van Gogh en 1889.",
    { duration: 45 },
  ),
  poll("Lequel de ces chefs-d’œuvre accrocheriez-vous dans votre salon ?", [
    "La Nuit étoilée",
    "La Jeune Fille à la perle",
    "Le Cri",
    "La Grande Vague",
  ]),
  scale("Après ce quiz, vous sentez-vous l’âme d’un artiste ?", "Pas du tout", "Je file au musée"),
  outro(
    "Le musée ferme ses portes…",
    "… mais pas SQuizz ! Ce quiz est un SQuizz Original : dupliquez-le pour l’adapter à votre visite, ou créez le vôtre avec vos propres images.",
  ),
];
