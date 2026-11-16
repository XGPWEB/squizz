import { choice, media, opinion, outro, pin, poll, slide, trueFalse, typed } from "./kit";

const m = media("ecrans");

/**
 * « Réseaux sociaux : les bons réflexes » (2026-11), for youth services: cyberbullying, image rights, fake
 * news, scams. Players are addressed with « tu ». Facts are legal ones (Code pénal, Code civil, law of
 * 2 March 2022) or the conditions of use of the main networks; the 3018 is the national helpline run by
 * e-Enfance. Ends with two anonymous opinion steps.
 */
export const ecrans = [
  slide(
    "title",
    "Réseaux sociaux : les bons réflexes",
    "Arnaques, rumeurs, harcèlement, photos : dix situations pour surfer sans se faire piéger.",
    [m.img("couverture", "Un téléphone et des bulles de notifications")],
  ),
  pin(
    "Ce concours a l’air génial… mais un détail montre que c’est une arnaque. Place ton pin’s dessus !",
    m.img("publication", "Une publication vue ce matin"),
    { x: 0.45, y: 0.71, radius: 0.15 },
    "La demande de code : aucun vrai concours ne te demande ton mot de passe ou le code reçu par SMS. Avec ce code, l’arnaqueur prend ton compte et écrit à tes contacts en se faisant passer pour toi.",
  ),
  typed(
    "Quel est le numéro national, gratuit et anonyme, contre le cyberharcèlement ?",
    ["3018", "30 18"],
    "Le 3018, joignable par téléphone, par tchat sur 3018.fr ou par l’appli : il peut aussi faire supprimer des contenus auprès des réseaux sociaux. Il est géré par l’association e-Enfance.",
  ),
  trueFalse(
    "Partager une photo d’un ami sans lui demander, ce n’est pas grave si elle est drôle.",
    false,
    "Faux : chacun a droit au respect de sa vie privée et de son image (article 9 du Code civil). Avant de publier une photo de quelqu’un, on lui demande son accord.",
  ),
  trueFalse(
    "En France, le harcèlement scolaire est un délit.",
    true,
    "Vrai : la loi du 2 mars 2022 en a fait un délit à part entière (article 222-33-2-3 du Code pénal), y compris quand il continue sur les réseaux sociaux.",
  ),
  choice(
    "À partir de quel âge les conditions d’utilisation d’Instagram, TikTok et Snapchat autorisent-elles l’inscription ?",
    ["10 ans", "13 ans", "16 ans", "18 ans"],
    1,
    "13 ans, selon leurs propres conditions d’utilisation. Mentir sur son âge, c’est se retrouver face à des contenus et des inconnus dont ces règles sont censées protéger.",
  ),
  choice(
    "Lesquels de ces réflexes aident à repérer une fausse information ?",
    [
      "Chercher qui a publié l’info à l’origine",
      "Vérifier si d’autres médias en parlent",
      "Regarder la date de publication",
      "La croire si elle a beaucoup de likes",
      "La partager vite avant qu’elle soit supprimée",
    ],
    [0, 1, 2],
    "Source, recoupement, date : les trois réflexes des journalistes. Le nombre de likes ne dit rien de la vérité, et une fausse info se propage justement parce qu’on la partage vite.",
    { duration: 30 },
  ),
  trueFalse(
    "Repartager une capture d’écran qui se moque de quelqu’un, ce n’est pas participer au harcèlement.",
    false,
    "Faux : partager, liker ou commenter, c’est faire grossir le harcèlement. Le bon réflexe : ne pas relayer, soutenir la personne visée et signaler.",
  ),
  choice(
    "Un inconnu très sympa te demande des photos de toi après quelques jours de discussion. Que fais-tu ?",
    [
      "J’envoie, il a l’air gentil",
      "J’arrête la discussion, je bloque et j’en parle à un adulte de confiance",
      "Je lui demande d’abord une photo de lui",
      "J’attends de mieux le connaître",
    ],
    1,
    "On coupe, on bloque, on en parle. Les prédateurs gagnent la confiance avant de demander des photos, puis menacent de les diffuser. Ce n’est jamais la faute de la victime, et le 3018 peut aider.",
  ),
  choice(
    "Une vidéo montre une célébrité dire quelque chose de choquant. Elle a peut-être été fabriquée par une IA. Comment s’appelle ce type de trucage ?",
    ["Un mème", "Un hypertrucage (deepfake)", "Un filtre", "Un replay"],
    1,
    "Un hypertrucage, ou deepfake : l’IA imite un visage et une voix. Indices possibles : lèvres mal synchronisées, regard figé, propos qu’aucun média sérieux ne rapporte.",
  ),
  poll(
    "Combien de temps passes-tu sur ton téléphone par jour, à peu près ?",
    ["Moins d’1 heure", "1 à 3 heures", "3 à 5 heures", "Plus de 5 heures"],
    { anonymous: true },
  ),
  opinion("wordcloud", "En un mot, ce que les réseaux sociaux t’apportent ?", { anonymous: true }),
  outro(
    "À vous de jouer !",
    "Créez votre quiz de prévention : santé, sécurité routière, égalité, citoyenneté…",
  ),
];
