import { choice, match, media, opinion, outro, slide, trueFalse, typed } from "./kit";

const m = media("associations");

/**
 * « Association loi 1901 : le quiz » (2026-11), for associations: the law of 1 July 1901 and its articles
 * (Légifrance), the RNA, local law in Alsace-Moselle. Only stable facts, each with its source in the
 * explanation; no national figure (they change with every survey). Ends with an opinion step for volunteers.
 */
export const loi1901 = [
  slide(
    "title",
    "Association loi 1901 : le quiz",
    "Création, statuts, bénévolat : dix questions pour tout savoir de la loi qui fait vivre les associations.",
    [m.img("couverture", "Des mains levées et un mégaphone")],
  ),
  choice(
    "Quelle est la date de la loi relative au contrat d’association ?",
    ["14 juillet 1889", "1er juillet 1901", "9 décembre 1905", "4 octobre 1958"],
    1,
    "Le 1er juillet 1901. Elle porte le nom de Pierre Waldeck-Rousseau, alors président du Conseil, qui l’a défendue.",
  ),
  choice(
    "Combien de personnes faut-il, au minimum, pour fonder une association ?",
    ["1", "2", "3", "7"],
    1,
    "Deux : l’article 1er définit l’association comme « la convention par laquelle deux ou plusieurs personnes mettent en commun » leurs connaissances ou leur activité, dans un but autre que de partager des bénéfices.",
  ),
  trueFalse(
    "Une association loi 1901 n’a pas le droit de faire de bénéfices.",
    false,
    "Faux : elle peut dégager des excédents, et c’est même sain. Ce qui est interdit, c’est de les partager entre ses membres : ils servent le projet de l’association.",
  ),
  trueFalse(
    "Une association doit être déclarée pour exister.",
    false,
    "Faux : l’article 2 permet de s’associer librement, sans autorisation ni déclaration. Mais seule l’association déclarée a la personnalité juridique : ouvrir un compte, recevoir une subvention, signer un bail.",
  ),
  choice(
    "Par quelle lettre commence le numéro RNA d’une association ?",
    ["A", "F", "R", "W"],
    3,
    "W, suivi de neuf chiffres. Le Répertoire national des associations (RNA) attribue ce numéro lors de la déclaration ; il est demandé pour les subventions.",
  ),
  trueFalse(
    "Un jeune de 16 ans peut créer une association et en être dirigeant.",
    true,
    "Vrai : depuis la loi Égalité et citoyenneté du 27 janvier 2017 (article 2 bis de la loi de 1901), un mineur de 16 ans révolus peut librement constituer une association et l’administrer. Ses représentants légaux en sont informés.",
  ),
  match(
    "Reliez chaque grande loi de liberté à son année.",
    [
      ["Liberté de la presse", "1881"],
      ["Liberté syndicale", "1884"],
      ["Liberté d’association", "1901"],
      ["Séparation des Églises et de l’État", "1905"],
    ],
    "Quatre lois de la IIIe République. Waldeck-Rousseau en a porté deux : celle de 1884 sur les syndicats, comme ministre de l’Intérieur, et celle de 1901.",
  ),
  choice(
    "Dans quels départements les associations relèvent-elles d’un droit local différent ?",
    [
      "Bas-Rhin, Haut-Rhin et Moselle",
      "Corse-du-Sud et Haute-Corse",
      "Les départements d’outre-mer",
      "Paris et la petite couronne",
    ],
    0,
    "En Alsace-Moselle, les associations relèvent du Code civil local (articles 21 à 79-III) : il faut au moins sept membres fondateurs et l’inscription au registre du tribunal judiciaire.",
  ),
  typed(
    "Quel document fixe le nom, l’objet et le fonctionnement d’une association ?",
    ["les statuts", "statuts", "statut"],
    "Les statuts : la loi laisse une grande liberté, mais ils doivent au moins indiquer le nom (le titre), l’objet et le siège de l’association, déposés lors de la déclaration en préfecture.",
  ),
  choice(
    "Quel jour l’ONU a-t-elle choisi pour la Journée internationale des volontaires ?",
    ["21 mars", "1er mai", "5 décembre", "31 décembre"],
    2,
    "Le 5 décembre, instituée par l’Assemblée générale des Nations unies en 1985 pour saluer l’engagement bénévole.",
  ),
  opinion("wordcloud", "En un mot, pourquoi êtes-vous bénévole ?", { anonymous: true }),
  outro(
    "À vous de jouer !",
    "Créez le quiz de votre association : son histoire, ses projets, ses bénévoles.",
  ),
];
