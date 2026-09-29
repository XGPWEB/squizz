import type { Metadata } from "next";
import { Legal, Mail } from "@/components/site/legal";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Informations légales obligatoires sur l’éditeur du service SQuizz : identité, hébergeur, coordonnées et propriété intellectuelle.",
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegalesPage() {
  const c = COMPANY_INFO;
  return (
    <Legal title="Mentions légales" eyebrow="Informations légales">
      <p>
        Conformément aux dispositions de l’article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la
        confiance dans l’économie numérique (LCEN), les utilisateurs du service <strong>{c.brand}</strong>{" "}
        sont informés de l’identité des différentes parties prenantes à sa réalisation et à son suivi.
      </p>

      <h2>1. Éditeur du service</h2>
      <ul className="legal-facts">
        <li>
          <strong>Nom :</strong> {c.editor.name}
        </li>
        <li>
          <strong>Forme juridique :</strong> {c.editor.legalForm}
        </li>
        <li>
          <strong>SIRET :</strong> {c.editor.siret}
        </li>
        <li>
          <strong>Immatriculation :</strong> {c.editor.rcs}
        </li>
        <li>
          <strong>Capital social :</strong> {c.editor.capital}
        </li>
        <li>
          <strong>Code APE :</strong> {c.editor.apeCode}
        </li>
        <li>
          <strong>Siège social :</strong> {c.editor.address}
        </li>
        <li>
          <strong>Téléphone :</strong>{" "}
          <a href={`tel:${c.editor.phone.replace(/\s/g, "")}`}>{c.editor.phone}</a>
        </li>
        <li>
          <strong>Email :</strong> <Mail />
        </li>
        <li>
          <strong>TVA :</strong> {c.editor.vatNumber}
        </li>
        <li>
          <strong>Directeur de la publication :</strong> {c.editor.director}
        </li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        Le service {c.brand} est hébergé sur un serveur privé virtuel (VPS) loué auprès de{" "}
        <strong>{c.host.name}</strong>, situé à l’adresse {c.host.address}. Site web :{" "}
        <a href={c.host.website} target="_blank" rel="noreferrer noopener">
          {c.host.website}
        </a>
        . La base de données et les médias importés sont stockés sur ce même serveur.
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus présents sur le service {c.brand} (textes, images, logos, graphismes, design,
        code source) est la propriété exclusive de {c.editor.name}, ou des partenaires ayant autorisé leur
        utilisation. Toute reproduction, représentation, modification, publication ou adaptation, totale ou
        partielle, par quelque procédé que ce soit, est interdite sans autorisation écrite préalable.
      </p>
      <p>
        La marque {c.brand} ainsi que son identité visuelle sont protégées. Toute utilisation non autorisée
        est susceptible de constituer une contrefaçon (art. L.713-2 et suivants du Code de la propriété
        intellectuelle).
      </p>
      <p>
        Les quiz, textes et médias créés ou importés par les utilisateurs restent leur propriété ; ils
        garantissent disposer des droits nécessaires sur ces contenus.
      </p>

      <h2>4. Responsabilité</h2>
      <p>
        L’éditeur s’efforce de fournir un service disponible et des informations exactes. Il ne saurait
        toutefois être tenu pour responsable d’erreurs, d’une absence de disponibilité des informations, ou de
        la présence de virus sur le site.
      </p>
      <p>
        Le service {c.brand} étant fourni « en l’état », l’éditeur ne garantit pas qu’il sera exempt
        d’anomalies, erreurs ou bugs. Toute interruption du service pour maintenance ou pour cause de force
        majeure ne saurait engager sa responsabilité.
      </p>

      <h2>5. Liens hypertextes</h2>
      <p>
        Le service {c.brand} peut contenir des liens vers des sites tiers (vidéos YouTube, liens ajoutés dans
        les quiz, etc.). L’éditeur n’exerce aucun contrôle sur ces sites et décline toute responsabilité quant
        à leur contenu, leurs pratiques ou leur disponibilité.
      </p>

      <h2>6. Droit applicable et juridiction</h2>
      <p>
        Les présentes mentions légales sont soumises au droit français. Tout litige relatif à leur
        interprétation ou à leur exécution relève de la compétence exclusive des tribunaux français.
      </p>

      <h2>7. Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales, contactez-nous à <Mail />.
      </p>
    </Legal>
  );
}
