import type { Metadata } from "next";
import Link from "next/link";
import { Legal, Mail } from "@/components/site/legal";
import { COMPANY_INFO } from "@/lib/company-info";
import { EVENT_PASS, PLAN_KEYS, PLANS, priceLabel } from "@/lib/plans";

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
          La création de quiz, sondages et diapositives (14 types de questions et 6 mises en page de diapo)
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

      <h2>3. Offres et prix</h2>
      <p>
        Le Service est proposé selon quatre formules, dont le contenu et les limites (nombre de quiz, de
        membres, de joueurs par partie, volume de médias) sont décrits sur la page{" "}
        <Link href="/tarifs">Tarifs</Link> :
      </p>
      <ul>
        {PLAN_KEYS.map((k) => (
          <li key={k}>
            <strong>{PLANS[k].label}</strong> :{" "}
            {PLANS[k].price === 0
              ? "gratuit, sans moyen de paiement"
              : `${priceLabel(PLANS[k])}, abonnement ${PLANS[k].period === "an" ? "annuel payable d’avance" : "mensuel"}`}
            .
          </li>
        ))}
      </ul>
      <p>
        Les prix sont exprimés en euros, nets de taxes : TVA non applicable, art. 293 B du CGI. Les offres
        payantes sont souscrites par un administrateur de l’Organisation depuis la page « Abonnement » de son
        espace, et payées par carte bancaire via le prestataire de paiement Stripe ; l’offre est activée dès
        le paiement accepté et une facture est émise à chaque échéance. À défaut, elles peuvent être
        souscrites en écrivant à l’Éditeur (<Mail />
        ), qui active l’offre et adresse une facture payable à réception. Les abonnements sont reconduits
        tacitement à chaque échéance (mois ou année) tant qu’ils ne sont pas arrêtés ; le moyen de paiement
        enregistré est alors débité automatiquement. Pour l’abonnement annuel, l’Éditeur rappelle au Client
        par e-mail, un à trois mois avant l’échéance, la date de reconduction et la possibilité de ne pas la
        reconduire.
      </p>
      <p>
        <strong>{EVENT_PASS.label}.</strong> Le Client peut aussi acheter, sans abonnement, un{" "}
        {EVENT_PASS.label} au prix de {EVENT_PASS.price} € : un paiement unique par carte bancaire via Stripe
        qui donne à l’Organisation les limites de l’offre {PLANS[EVENT_PASS.plan].label} pendant{" "}
        {EVENT_PASS.days} jours à compter du paiement. Il n’est pas reconduit ; un nouvel achat pendant un
        pack en cours prolonge celui-ci de {EVENT_PASS.days} jours. À son terme, l’Organisation retrouve son
        offre habituelle et ses quiz et médias sont conservés. Le pack déjà activé n’est pas remboursé prorata
        temporis, sauf exercice du droit de rétractation prévu à l’article 4.
      </p>
      <p>
        Le Client peut changer d’offre à tout moment ; la différence de prix est calculée au prorata de la
        période restante. Les Organisations désignées partenaires par l’Éditeur bénéficient gratuitement de
        l’offre Premium, tant que dure le partenariat. L’Éditeur peut faire évoluer le contenu, les limites et
        les prix des offres ; les Clients abonnés en sont informés par e-mail au moins trente (30) jours à
        l’avance et peuvent arrêter leur abonnement avant l’entrée en vigueur du changement.
      </p>

      <h2>4. Sans engagement : arrêt de l’abonnement et résiliation</h2>
      <p>
        Les abonnements sont <strong>sans engagement de durée</strong>. Un administrateur de l’Organisation
        peut arrêter l’abonnement à tout moment, en un clic depuis la page « Abonnement » de son espace
        (bouton « Arrêter mon abonnement ») ou en écrivant à <Mail />. Un e-mail confirme l’arrêt.
      </p>
      <ul>
        <li>
          <strong>Abonnements mensuels</strong> (Essentiel, Pro) : l’arrêt prend effet à la fin du mois en
          cours ; aucun nouveau paiement n’est demandé.
        </li>
        <li>
          <strong>Abonnement annuel</strong> (Premium) : l’abonnement n’est pas reconduit et reste actif
          jusqu’à la fin de l’année déjà payée.
        </li>
      </ul>
      <p>
        La période en cours déjà payée n’est pas remboursée prorata temporis, sauf exercice du droit de
        rétractation ci-dessous. À la fin de l’abonnement, l’Organisation repasse sur l’offre Gratuit : ses
        quiz et médias sont conservés, mais la création de nouveaux contenus est soumise aux limites de cette
        offre. Le Client peut aussi cesser d’utiliser le Service et demander la suppression de son
        Organisation à tout moment.
      </p>
      <p>
        <strong>Droit de rétractation.</strong> Le Client consommateur dispose d’un délai de quatorze (14)
        jours à compter de la souscription pour se rétracter, sans motif, en écrivant à <Mail /> (art. L221-18
        du Code de la consommation). S’il a demandé que l’offre soit activée avant la fin de ce délai, il paie
        le montant correspondant au service fourni jusqu’à sa rétractation ; le reste lui est remboursé sous
        quatorze (14) jours.
      </p>
      <p>
        L’Éditeur se réserve le droit de suspendre ou de résilier le compte d’une Organisation en cas de
        manquement grave aux présentes, notamment : non-paiement, utilisation frauduleuse, publication de
        contenus illicites, haineux ou portant atteinte aux droits de tiers.
      </p>

      <h2>5. Contenus publiés</h2>
      <p>
        Le Client est seul responsable des quiz, textes, images, vidéos et extraits sonores qu’il crée ou
        importe (y compris la musique des questions « Blind test », dont la diffusion en public peut exiger
        une autorisation, par exemple de la SACEM), ainsi que de leur affichage lors des parties. Il garantit
        disposer des droits nécessaires sur ces contenus et s’interdit toute publication illicite. Il veille
        également à ce que les pseudos choisis par les Joueurs lors de ses parties restent appropriés.
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

      <h2 id="donnees">9. Données personnelles et sous-traitance</h2>
      <p>
        Les traitements réalisés par l’Éditeur pour son propre compte sont décrits dans la{" "}
        <Link href="/confidentialite">Politique de confidentialité</Link>.
      </p>
      <p>
        Pour les données des joueurs et des membres qu’elle invite, l’Organisation est responsable du
        traitement et l’Éditeur agit en qualité de <strong>sous-traitant</strong> au sens de l’article 28 du
        RGPD. À ce titre, l’Éditeur s’engage à :
      </p>
      <ul>
        <li>
          ne traiter ces données que pour fournir le Service et selon les instructions de l’Organisation ;
        </li>
        <li>garantir la confidentialité des personnes habilitées à les traiter ;</li>
        <li>
          mettre en œuvre les mesures de sécurité décrites dans la Politique de confidentialité (chiffrement
          des échanges, isolation entre organisations, sauvegardes, journal des actions sensibles) ;
        </li>
        <li>
          ne recourir qu’aux sous-traitants ultérieurs listés dans la Politique de confidentialité et informer
          l’Organisation de tout changement, qu’elle peut refuser en résiliant ;
        </li>
        <li>
          aider l’Organisation à répondre aux demandes d’exercice des droits et à ses obligations de sécurité
          ;
        </li>
        <li>
          notifier toute violation de données dans les meilleurs délais, et au plus tard sous 48 heures ;
        </li>
        <li>
          supprimer ces données à la fin du Service (suppression de l’organisation) et en permettre l’export
          auparavant ;
        </li>
        <li>
          mettre à disposition les informations nécessaires pour démontrer le respect de ces obligations.
        </li>
      </ul>
      <p>
        Les données concernées sont les pseudos, réponses et scores des joueurs (partie conservée 24 heures,
        résultats 12 mois) et les nom, email et rôle des membres (conservés tant que l’organisation existe).
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
        l’adresse <Mail />. À défaut d’accord amiable, le litige est porté devant les juridictions compétentes
        dans les conditions de l’article 12.
      </p>

      <h2>12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU/CGV sont régies par le droit français.{" "}
        <strong>
          Entre professionnels, tout litige relatif à leur interprétation ou exécution relève de la compétence
          exclusive du Tribunal de commerce du siège social de l’Éditeur, même en cas d’appel en garantie ou
          de pluralité de défendeurs.
        </strong>{" "}
        Si le Client est un consommateur, il peut saisir la juridiction de son lieu de domicile ou celle du
        lieu d’exécution du Service, conformément au Code de la consommation.
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question, contactez-nous à <Mail />.
      </p>
    </Legal>
  );
}
