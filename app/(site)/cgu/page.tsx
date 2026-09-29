import type { Metadata } from "next";
import Link from "next/link";
import { Legal, Mail } from "@/components/site/legal";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation et de vente",
  description:
    "Conditions générales d’utilisation et de vente du service SQuizz : création de quiz interactifs et animation de parties en direct.",
  alternates: { canonical: "/cgu" },
};

export default function CGUPage() {
  const c = COMPANY_INFO;
  return (
    <Legal title="Conditions générales" eyebrow="Conditions générales d’utilisation et de vente">
      <p>
        Les présentes Conditions Générales d’Utilisation et de Vente (ci-après « <strong>CGU/CGV</strong> »)
        régissent l’utilisation du service <strong>{c.brand}</strong> (ci-après le « <strong>Service</strong>{" "}
        ») édité par <strong>{c.editor.name}</strong> (ci-après l’« <strong>Éditeur</strong> ») et accessible
        via le domaine <code>{c.domain}</code>.
      </p>
      <p>
        L’utilisation du Service implique l’acceptation pleine et entière des présentes CGU/CGV par
        l’utilisateur (ci-après le « <strong>Client</strong> »).
      </p>

      <h2>1. Objet</h2>
      <p>
        Le Service {c.brand} est une plateforme SaaS (Software as a Service) permettant à des organisations
        (entreprises, établissements d’enseignement, associations, organisateurs d’événements — ci-après l’«{" "}
        <strong>Organisation</strong> ») de créer des quiz interactifs et de les faire jouer en direct,
        incluant notamment :
      </p>
      <ul>
        <li>
          La création de quiz, sondages et diapositives (14 types de questions, 6 mises en page de diapo)
        </li>
        <li>L’animation de parties en direct, rejointes par les participants via un code ou un QR code</li>
        <li>Le classement en temps réel et le podium final</li>
        <li>La gestion d’une équipe d’animateurs et de leurs droits</li>
      </ul>
      <p>
        Les participants (ci-après les « <strong>Joueurs</strong> ») rejoignent une partie avec un simple
        pseudo, sans créer de compte.
      </p>

      <h2>2. Inscription et compte</h2>
      <p>
        L’accès aux fonctions de création et d’animation nécessite la création d’un compte par un responsable
        de l’Organisation, qui en devient l’administrateur et peut inviter d’autres membres. Le Client
        garantit que les informations fournies sont exactes, complètes et à jour. Il est seul responsable de
        la confidentialité de ses identifiants et des droits qu’il attribue aux membres de son Organisation.
      </p>
      <p>
        Le Client s’engage à informer immédiatement l’Éditeur de toute utilisation non autorisée de son
        compte. L’Éditeur ne saurait être tenu responsable des conséquences d’une perte ou usage frauduleux
        d’identifiants imputable au Client.
      </p>

      <h2>3. Offres</h2>
      <p>
        Le Service est proposé selon deux formules décrites sur la page <Link href="/tarifs">Tarifs</Link> :
      </p>
      <ul>
        <li>
          <strong>Gratuit</strong> : sans engagement ni moyen de paiement, dans les limites indiquées (nombre
          de quiz, de membres, de joueurs par partie et volume de médias).
        </li>
        <li>
          <strong>Pro</strong> : limites étendues, sur devis. Les conditions tarifaires, la durée et les
          modalités de paiement font l’objet d’un devis accepté par le Client. Les prix sont exprimés en euros
          ; TVA non applicable, art. 293 B du CGI.
        </li>
      </ul>
      <p>
        L’Éditeur peut faire évoluer le contenu et les limites des offres ; les Clients Pro en sont informés
        par email au moins trente (30) jours à l’avance.
      </p>

      <h2>4. Résiliation</h2>
      <p>
        Le Client peut cesser d’utiliser le Service à tout moment et demander la suppression de son
        Organisation en écrivant à <Mail />. Pour l’offre Pro, la résiliation prend effet à la fin de la
        période en cours déjà facturée ; aucun remboursement prorata temporis n’est effectué pour la période
        restante.
      </p>
      <p>
        L’Éditeur se réserve le droit de suspendre ou de résilier le compte d’une Organisation en cas de
        manquement grave aux présentes, notamment : non-paiement, utilisation frauduleuse, publication de
        contenus illicites, haineux ou portant atteinte aux droits de tiers.
      </p>

      <h2>5. Contenus publiés</h2>
      <p>
        Le Client est seul responsable des quiz, textes, images et vidéos qu’il crée ou importe, ainsi que de
        leur affichage lors des parties. Il garantit disposer des droits nécessaires sur ces contenus et
        s’interdit toute publication illicite. Il veille également à ce que les pseudos choisis par les
        Joueurs lors de ses parties restent appropriés.
      </p>

      <h2>6. Disponibilité et maintenance</h2>
      <p>
        L’Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du Service 24h/24 et
        7j/7. Toutefois, l’accès peut être interrompu pour maintenance, mise à jour, ou pour des raisons
        indépendantes de la volonté de l’Éditeur (force majeure, incident technique, etc.) sans que ces
        interruptions puissent engager la responsabilité de l’Éditeur.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        L’ensemble du Service (code, design, contenu, marque) est la propriété exclusive de {c.editor.name}.
        Le Client se voit accorder un droit d’usage personnel, non exclusif et non transférable du Service,
        dans la limite des présentes CGU/CGV et de l’offre choisie.
      </p>
      <p>
        Le Client conserve la pleine propriété des données et contenus qu’il renseigne dans le Service (quiz,
        médias, informations de l’Organisation). Il accorde toutefois à l’Éditeur une licence non exclusive
        d’usage à des fins strictement nécessaires à la fourniture du Service.
      </p>

      <h2>8. Responsabilité</h2>
      <p>L’Éditeur fournit le Service « en l’état » et ne saurait être tenu responsable de :</p>
      <ul>
        <li>
          L’impact d’une indisponibilité du Service sur un événement, une formation ou une réunion du Client
        </li>
        <li>L’exactitude des questions et réponses saisies par le Client</li>
        <li>Les contenus importés par le Client ou les pseudos saisis par les Joueurs</li>
        <li>L’usage que les Joueurs font du Service</li>
      </ul>
      <p>
        En tout état de cause, la responsabilité de l’Éditeur, si elle venait à être engagée, est plafonnée au
        montant des sommes effectivement versées par le Client au cours des douze (12) mois précédant le fait
        générateur du dommage.
      </p>

      <h2>9. Données personnelles</h2>
      <p>
        Les modalités de traitement des données personnelles sont décrites dans la{" "}
        <Link href="/confidentialite">Politique de confidentialité</Link> accessible séparément.
      </p>

      <h2>10. Modifications des CGU/CGV</h2>
      <p>
        L’Éditeur se réserve le droit de modifier les présentes CGU/CGV à tout moment. Les modifications sont
        notifiées aux administrateurs des Organisations par email au moins trente (30) jours avant leur entrée
        en vigueur. En cas de désaccord, le Client peut résilier avant la date de prise d’effet.
      </p>

      <h2>11. Médiation</h2>
      <p>
        En cas de litige avec l’Éditeur, le Client est invité à contacter en priorité le service client à
        l’adresse <Mail />. À défaut d’accord amiable, le Client professionnel peut saisir le tribunal
        compétent (cf. clause attributive de juridiction ci-après).
      </p>

      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU/CGV sont régies par le droit français.{" "}
        <strong>
          Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive du Tribunal
          de commerce du siège social de l’Éditeur, même en cas d’appel en garantie ou de pluralité de
          défendeurs.
        </strong>
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question, contactez-nous à <Mail />.
      </p>
    </Legal>
  );
}
