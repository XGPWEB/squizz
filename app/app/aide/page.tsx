import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CreditCard,
  Link2,
  Mail,
  Palette,
  PenLine,
  Play,
  Rocket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Fold } from "@/components/site/fold";
import { EVENT_PASS, PLAN_KEYS, PLANS } from "@/lib/plans";
import { QUESTION_COUNT } from "@/lib/seo";
import { pageUser } from "@/lib/server/guard";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = { title: "Notice d’utilisation" };

/** A button or tab as the screen names it. */
const B = ({ children }: { children: React.ReactNode }) => <kbd className="ui-label">{children}</kbd>;

type Chapter = {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Only administrators see this part of the space. */
  admin?: boolean;
  intro: React.ReactNode;
  steps: React.ReactNode[];
  more?: { title: string; body: React.ReactNode }[];
};

const free = PLANS.FREE;
const limits = PLAN_KEYS.map((k) => PLANS[k]);

/**
 * How to use the organiser's space, chapter by chapter, with the labels the screens show. Each claim
 * matches the app as it is: update it with the feature (see CHANGELOG.md).
 */
const CHAPTERS: Chapter[] = [
  {
    id: "premiers-pas",
    title: "Premiers pas",
    icon: Rocket,
    intro: "Le chemin le plus court entre votre espace et une salle qui joue.",
    steps: [
      <>
        Dans <B>Mes quiz</B>, cliquez sur <B>Créer un quiz</B>, ou partez d’un modèle de{" "}
        <B>SQuizz Originals</B>.
      </>,
      <>
        Ajoutez vos questions, puis <B>Enregistrer le quiz</B>.
      </>,
      <>
        Sur la carte du quiz, cliquez sur <B>Lancer une partie</B> : le grand écran affiche un code et un QR
        code.
      </>,
      <>
        Les joueurs ouvrent <b>{COMPANY_INFO.siteUrl.replace(/^https?:\/\//, "")}/jouer</b> sur leur
        téléphone, tapent le code et choisissent un pseudo. Puis <B>Lancer le quiz</B>.
      </>,
    ],
  },
  {
    id: "creer",
    title: "Créer un quiz",
    icon: PenLine,
    intro: `${QUESTION_COUNT} types de questions, des diapos et une roue, à écrire vous-même, à importer ou à faire proposer par l’IA.`,
    steps: [
      <>
        <B>Créer un quiz</B> : donnez un titre, puis <B>Ajouter une étape</B>. L’assistant passe par{" "}
        <B>Type</B>, <B>Contenu</B> et <B>Aperçu</B>, et se termine par <B>Ajouter au quiz</B>.
      </>,
      <>
        Pour chaque question, réglez le <B>Temps imparti</B> (de 5 à 240 secondes) et les points :{" "}
        <B>Standard</B>, <B>Points doubles</B> ou <B>Aucun point</B>.
      </>,
      <>
        Ajoutez une image, une vidéo, un son ou un lien YouTube dans <B>Photos, vidéos, sons & liens</B>, et
        une <B>Explication de la réponse</B> affichée à la correction.
      </>,
      <>
        Terminez par <B>Enregistrer le quiz</B>. Tant que ce n’est pas fait, un brouillon est gardé sur cet
        appareil.
      </>,
    ],
    more: [
      {
        title: "Créer avec l’IA",
        body: (
          <>
            <p>
              <B>Créer avec l’IA</B> : collez un texte ou ajoutez un PDF (10 Mo au plus), choisissez de 5 à 20
              questions, le niveau et les types, puis <B>Générer le quiz</B>. Le quiz s’ouvre dans l’éditeur :
              relisez-le avant de l’enregistrer.
            </p>
            <p>
              L’IA utilise le compte Claude ou ChatGPT de votre organisation. Un administrateur enregistre sa
              clé une fois, dans cette même fenêtre ; elle est chiffrée et jamais réaffichée.
            </p>
          </>
        ),
      },
      {
        title: "Importer depuis Excel, CSV ou un fichier .squizz",
        body: (
          <p>
            <B>Importer</B> accepte un tableur Excel ou CSV (une question par ligne, 30 étapes au plus) et les
            fichiers .squizz exportés d’un autre espace. Après l’import, <B>Vérifier</B> ouvre le quiz dans
            l’éditeur ; si des lignes ont été ignorées, le message propose le modèle Excel à télécharger.
          </p>
        ),
      },
      {
        title: "Qui voit le quiz dans l’équipe ?",
        body: (
          <ul>
            <li>
              <B>Brouillon privé</B> : vous seul.
            </li>
            <li>
              <B>Quelques personnes</B> : les membres cochés le voient, le modifient et le lancent.
            </li>
            <li>
              <B>Toute l’équipe</B> : tout le monde le voit et le lance ; seuls vous et les administrateurs le
              modifient.
            </li>
          </ul>
        ),
      },
      {
        title: "Questions d’avis anonymes, quiz à profils",
        body: (
          <p>
            Pour une question d’avis, le réglage <B>Réponses</B> propose <B>Avec le pseudo</B> ou{" "}
            <B>Anonymes</B> : personne ne sait qui a répondu quoi, pas même dans les résultats. Un{" "}
            <B>Quiz à profils</B> associe chaque réponse à un profil et révèle à la fin le profil dominant du
            groupe, sans classement.
          </p>
        ),
      },
    ],
  },
  {
    id: "animer",
    title: "Animer une partie",
    icon: Play,
    intro: "Le grand écran pour la salle, votre téléphone pour piloter si vous le souhaitez.",
    steps: [
      <>
        Projetez l’écran et cliquez sur <B>Plein écran</B>. Pour faire jouer quelqu’un à distance, envoyez{" "}
        <B>Copier l’invitation</B>.
      </>,
      <>
        Pour jouer en équipes, choisissez de 2 à 6 dans <B>ÉQUIPES</B> ; chacun choisit la sienne sur son
        téléphone, ou cliquez sur <B>Répartir au hasard</B>.
      </>,
      <>
        <B>Lancer le quiz</B>. La correction arrive à la fin du temps ou dès que tout le monde a répondu.
      </>,
      <>
        Avancez avec <B>Question suivante</B>, puis <B>Voir le podium</B> après la dernière question.
      </>,
    ],
    more: [
      {
        title: "La télécommande sur votre téléphone",
        body: (
          <p>
            <B>Télécommande</B> affiche un QR code secret, valable pour cette partie. Depuis votre téléphone :{" "}
            <B>Lancer le quiz</B>, <B>Arrêter et corriger</B> pour couper le chrono, <B>Suite</B>,{" "}
            <B>Lancer la roue</B>. Arrêter le chrono avant la fin ne se fait que depuis la télécommande.
          </p>
        ),
      },
      {
        title: "Les questions du public",
        body: (
          <p>
            <B>Questions</B> ouvre le mur : cochez <B>Questions ouvertes aux participants</B>, et{" "}
            <B>Valider chaque question avant de l’afficher</B> pour modérer. Les participants touchent{" "}
            <B>Poser une question</B> ; vous marquez chaque question <B>Répondue</B> ou la <B>Masquer</B>.
          </p>
        ),
      },
      {
        title: "Jouer aussi, retirer un joueur",
        body: (
          <p>
            Dans la salle d’attente, <B>Jouer aussi</B> vous ajoute aux joueurs avec votre pseudo. L’icône{" "}
            <B>Retirer ce joueur</B> exclut un pseudo : il ne peut pas revenir dans la partie.
          </p>
        ),
      },
      {
        title: "Et si je ferme la page en cours de partie ?",
        body: (
          <p>
            Il n’y a pas de bouton pour arrêter une partie : il suffit de la quitter. Elle apparaît ensuite
            dans <B>Résultats</B> comme « Arrêtée à x/y », avec les réponses déjà données.
          </p>
        ),
      },
    ],
  },
  {
    id: "autonomie",
    title: "Faire jouer à distance",
    icon: Link2,
    intro: "Sans animateur : chacun joue seul, à son rythme, avec correction immédiate.",
    steps: [
      <>
        Sur la carte du quiz, cliquez sur l’icône <B>Lien en autonomie</B>.
      </>,
      <>
        Choisissez la durée : <B>24 heures</B>, <B>7 jours</B> ou <B>30 jours</B>, puis <B>Créer le lien</B>.
      </>,
      <>
        Partagez le lien ou le QR code avec <B>Copier</B>.
      </>,
    ],
    more: [
      {
        title: "Rejouer une partie en différé",
        body: (
          <p>
            À la fin d’une partie en direct, <B>Rejouer en différé</B> rouvre le même quiz en autonomie
            pendant 7 jours, pour les absents ou ceux qui veulent retenter leur chance.
          </p>
        ),
      },
      {
        title: "Suivre et fermer un lien",
        body: (
          <p>
            Vos liens sont dans <B>Résultats</B>, rubrique <B>Liens en autonomie</B>. L’icône de fermeture
            arrête le lien : plus personne ne peut jouer, les résultats restent.
          </p>
        ),
      },
    ],
  },
  {
    id: "resultats",
    title: "Les résultats",
    icon: BarChart3,
    intro: "Chaque partie de l’organisation, gardée 12 mois.",
    steps: [
      <>
        Ouvrez <B>Résultats</B> et choisissez une partie : classement, question par question, réponses de
        chaque joueur.
      </>,
      <>
        <B>Excel</B> télécharge toutes les réponses ; <B>Imprimer ou PDF</B> donne une version à joindre à un
        compte rendu.
      </>,
    ],
  },
  {
    id: "equipe",
    title: "L’équipe",
    icon: Users,
    admin: true,
    intro: "Plusieurs animateurs, une seule bibliothèque.",
    steps: [
      <>
        Dans <B>Équipe</B>, <B>Inviter un membre</B> : son e-mail et son rôle, puis <B>Inviter</B>.
      </>,
      <>
        Le lien d’invitation est valable 7 jours ; <B>Copier</B> pour l’envoyer vous-même.
      </>,
    ],
    more: [
      {
        title: "Administrateur ou animateur ?",
        body: (
          <ul>
            <li>
              <B>Animateur</B> : crée ses quiz et lance des parties.
            </li>
            <li>
              <B>Administrateur</B> : gère aussi l’équipe, tous les quiz, l’apparence et l’abonnement.
            </li>
          </ul>
        ),
      },
      {
        title: "Désactiver ou supprimer un membre",
        body: (
          <p>
            <B>Désactiver</B> bloque l’accès sans rien effacer, <B>Réactiver</B> le rend. <B>Supprimer</B>{" "}
            retire le membre ; ses quiz restent dans l’organisation.
          </p>
        ),
      },
    ],
  },
  {
    id: "apparence",
    title: "L’apparence des parties",
    icon: Palette,
    admin: true,
    intro: "Ce que voient vos participants, sur le grand écran et sur leur téléphone.",
    steps: [
      <>
        Dans <B>Apparence</B>, choisissez <B>SQuizz coloré</B> pour une soirée ou une classe, <B>Sobre</B>{" "}
        pour une réunion ou une formation. Le style sobre vouvoie les joueurs.
      </>,
      <>Ajoutez votre logo (PNG, JPG, WebP ou GIF, 1 Mo au plus) : il s’affiche dans les deux styles.</>,
      <>
        Avec le style sobre, choisissez aussi votre couleur. Puis <B>Enregistrer</B> : cela vaut pour les
        parties lancées ensuite.
      </>,
    ],
    more: [
      {
        title: "Masquer la mention « SQuizz »",
        body: (
          <p>
            La case <B>Afficher « SQuizz » en bas des écrans</B> peut être décochée avec une offre payante ou
            le {EVENT_PASS.label} en cours.
          </p>
        ),
      },
    ],
  },
  {
    id: "abonnement",
    title: "L’abonnement",
    icon: CreditCard,
    admin: true,
    intro: `L’offre gratuite permet d’essayer : ${free.maxQuizzes} quiz, ${free.maxPlayersPerGame} joueurs par partie.`,
    steps: [
      <>
        Dans <B>Abonnement</B>, cliquez sur <B>Choisir Essentiel</B>, <B>Choisir Pro</B>… sous l’offre voulue
        : le paiement est sécurisé par Stripe, sans engagement.
      </>,
      <>
        Pour un seul événement, <B>Acheter le pack</B> : {EVENT_PASS.price} € en une fois, {EVENT_PASS.days}{" "}
        jours au niveau {PLANS[EVENT_PASS.plan].label}, sans abonnement.
      </>,
      <>
        <B>Arrêter mon abonnement</B> : l’offre reste active jusqu’à la fin de la période payée, puis l’espace
        repasse en Gratuit. <B>Reprendre mon abonnement</B> annule l’arrêt.
      </>,
    ],
    more: [
      {
        title: "Ce que comprend chaque offre",
        body: (
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th scope="col">Offre</th>
                  <th scope="col">Quiz</th>
                  <th scope="col">Joueurs par partie</th>
                  <th scope="col">Membres</th>
                </tr>
              </thead>
              <tbody>
                {limits.map((p) => (
                  <tr key={p.label}>
                    <th scope="row">{p.label}</th>
                    <td>{p.maxQuizzes ?? "Illimités"}</td>
                    <td>{p.maxPlayersPerGame}</td>
                    <td>{p.maxMembers ?? "Illimités"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      },
    ],
  },
  {
    id: "compte",
    title: "Votre compte",
    icon: UserRound,
    intro: "Dans le menu à votre nom, en haut à droite.",
    steps: [
      <>
        <B>Mon compte</B> : changez votre nom affiché et votre mot de passe (les autres appareils sont alors
        déconnectés).
      </>,
      <>
        <B>Exporter mes données</B> télécharge votre compte et vos quiz. <B>Supprimer mon compte</B> demande
        votre mot de passe ; si vous êtes le seul membre, l’organisation est supprimée aussi.
      </>,
    ],
  },
];

export default async function GuidePage() {
  const user = await pageUser();
  const admin = user.role !== "HOST";
  return (
    <div className="guide">
      <div className="dash-heading">
        <div>
          <p className="eyebrow">NOTICE D’UTILISATION</p>
          <h1>SQuizz, mode d’emploi</h1>
          <p className="hint">
            Les gestes essentiels en quelques étapes ; ouvrez « En savoir plus » pour le détail. Les mots{" "}
            <B>en étiquette</B> sont ceux des boutons à l’écran.
          </p>
        </div>
      </div>
      <div className="guide-layout">
        <nav className="guide-toc" aria-label="Sommaire de la notice">
          <ol>
            {CHAPTERS.map((c, i) => (
              <li key={c.id} className={`tone-${i % 4}`}>
                <a href={`#${c.id}`}>
                  <c.icon aria-hidden />
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="guide-chapters">
          {CHAPTERS.map((c, i) => (
            <section
              key={c.id}
              id={c.id}
              className={`guide-chapter tone-${i % 4}`}
              aria-labelledby={`${c.id}-titre`}
            >
              <header>
                <span className="guide-num" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 id={`${c.id}-titre`}>{c.title}</h2>
                  <p>{c.intro}</p>
                </div>
                {c.admin && (
                  <span className="guide-admin">
                    {admin ? "Administrateurs" : "Réservé aux administrateurs"}
                  </span>
                )}
              </header>
              <ol className="guide-steps">
                {c.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
              {c.more && (
                <Fold
                  className="guide-more"
                  title="En savoir plus"
                  count={`${c.more.length} sujet${c.more.length > 1 ? "s" : ""}`}
                >
                  {c.more.map((m) => (
                    <div key={m.title} className="guide-topic">
                      <h3>{m.title}</h3>
                      {m.body}
                    </div>
                  ))}
                </Fold>
              )}
            </section>
          ))}
          <section className="guide-help">
            <Mail aria-hidden />
            <div>
              <h2>Une question qui n’est pas ici ?</h2>
              <p>
                Écrivez-nous à <a href={`mailto:${COMPANY_INFO.editor.email}`}>{COMPANY_INFO.editor.email}</a>{" "}
                ou par le <Link href="/#contact">formulaire de contact</Link> : on répond vite.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
