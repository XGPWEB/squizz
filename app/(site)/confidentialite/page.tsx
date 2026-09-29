import type { Metadata } from "next";
import { Legal, Mail } from "@/components/site/legal";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment SQuizz collecte, utilise et protège les données personnelles des organisations, des animateurs et des joueurs, conformément au RGPD.",
  alternates: { canonical: "/confidentialite" },
};

export default function PolitiqueConfidentialitePage() {
  const c = COMPANY_INFO;
  return (
    <Legal title="Politique de confidentialité" eyebrow="Protection des données personnelles">
      <p>
        La présente politique décrit comment <strong>{c.editor.name}</strong> (« nous », « notre »), éditeur
        du service <strong>{c.brand}</strong>, collecte, utilise et protège vos données personnelles dans le
        respect du Règlement Général sur la Protection des Données (« RGPD », règlement UE 2016/679) et de la
        loi Informatique et Libertés (loi n° 78-17 modifiée).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est <strong>{c.editor.name}</strong>, éditeur du Service, joignable à
        l’adresse <Mail />. Délégué à la protection des données (DPO) : {c.dpo.name} ({c.dpo.email}).
      </p>

      <h2>2. Quelles données nous collectons</h2>
      <h3>2.1 Comptes des organisations (administrateurs et animateurs)</h3>
      <ul>
        <li>Email (identifiant de connexion)</li>
        <li>Nom affiché</li>
        <li>Mot de passe (stocké uniquement sous forme de hachage bcrypt)</li>
        <li>Nom de l’organisation, rôle de chaque membre, date de dernière connexion</li>
        <li>Quiz et médias (images, vidéos) créés ou importés</li>
      </ul>
      <h3>2.2 Joueurs</h3>
      <p>Lorsqu’un joueur rejoint une partie avec un code, nous collectons uniquement :</p>
      <ul>
        <li>Le pseudo qu’il choisit (aucun nom, email ni téléphone n’est demandé)</li>
        <li>Ses réponses et son score pendant la partie</li>
        <li>Un identifiant anonyme aléatoire (cookie) pour le reconnaître pendant la partie</li>
      </ul>
      <p>
        <strong>Important</strong> : l’organisation qui anime la partie choisit le contenu des quiz et le
        contexte de jeu. Elle informe ses participants de l’usage qui est fait de leurs réponses (par exemple
        lors d’une formation ou d’un sondage interne).
      </p>
      <h3>2.3 Données techniques</h3>
      <ul>
        <li>Adresse IP (limitation des tentatives de connexion et d’inscription, logs serveur)</li>
        <li>Journal des actions sensibles (invitations, changements de rôle, suspensions, suppressions)</li>
      </ul>

      <h2>3. Pourquoi nous collectons ces données (finalités)</h2>
      <ul>
        <li>
          <strong>Fourniture du Service</strong> : authentification, création de quiz, animation des parties,
          classements
        </li>
        <li>
          <strong>Gestion des droits</strong> : rôles des membres, invitations, limites de l’offre
        </li>
        <li>
          <strong>Sécurité</strong> : prévention du brute force, verrouillage des comptes, journal d’audit
        </li>
        <li>
          <strong>Support</strong> : réponse aux demandes du Client
        </li>
        <li>
          <strong>Communication</strong> : emails transactionnels (invitation, réinitialisation du mot de
          passe, changements importants du Service)
        </li>
      </ul>

      <h2>4. Bases légales du traitement</h2>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : pour fournir le Service
        </li>
        <li>
          <strong>Obligation légale</strong> (art. 6.1.c RGPD) : conservation des factures de l’offre Pro (10
          ans, Code de commerce)
        </li>
        <li>
          <strong>Intérêt légitime</strong> (art. 6.1.f RGPD) : sécurité du Service, lutte contre la fraude,
          bon déroulement des parties
        </li>
      </ul>

      <h2>5. Combien de temps nous gardons vos données</h2>
      <table className="data-table legal-table">
        <thead>
          <tr>
            <th>Donnée</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Parties, pseudos et réponses des joueurs</td>
            <td>24 heures après la création de la partie, puis suppression automatique</td>
          </tr>
          <tr>
            <td>Comptes, quiz et médias d’une organisation active</td>
            <td>Tant que l’organisation existe</td>
          </tr>
          <tr>
            <td>Organisation supprimée</td>
            <td>Suppression immédiate de ses comptes, quiz, parties et médias</td>
          </tr>
          <tr>
            <td>Journal des actions sensibles</td>
            <td>12 mois</td>
          </tr>
          <tr>
            <td>Sauvegardes de la base de données</td>
            <td>7 jours glissants</td>
          </tr>
          <tr>
            <td>Factures (offre Pro)</td>
            <td>10 ans (obligation comptable)</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Avec qui nous partageons vos données</h2>
      <p>Nous utilisons le sous-traitant suivant pour fournir le Service :</p>
      <ul>
        <li>
          <strong>{c.host.name}</strong> — location du serveur (VPS) qui héberge l’application, la base de
          données, les médias et les sauvegardes
        </li>
      </ul>
      <p>
        Aucune donnée n’est vendue à des tiers à des fins commerciales. Aucun transfert de donnée hors UE/EEE
        n’est effectué sans garantie appropriée (clauses contractuelles types ou décision d’adéquation de la
        Commission européenne). Les vidéos YouTube intégrées dans un quiz sont chargées en mode «
        confidentialité renforcée » (youtube-nocookie.com) uniquement lorsque la question est affichée.
      </p>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>
          <strong>Droit d’accès</strong> : obtenir une copie de vos données
        </li>
        <li>
          <strong>Droit de rectification</strong> : corriger des données inexactes
        </li>
        <li>
          <strong>Droit à l’effacement</strong> (« droit à l’oubli »)
        </li>
        <li>
          <strong>Droit à la limitation</strong> du traitement
        </li>
        <li>
          <strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré
        </li>
        <li>
          <strong>Droit d’opposition</strong> au traitement
        </li>
        <li>
          <strong>Droit d’introduire une réclamation</strong> auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer noopener">
            www.cnil.fr
          </a>
          )
        </li>
      </ul>
      <p>
        Pour exercer vos droits, contactez-nous à <Mail email={c.dpo.email} />. Nous nous engageons à répondre
        sous un délai d’un mois.
      </p>

      <h2 id="cookies">8. Cookies</h2>
      <p>
        Le Service utilise uniquement des cookies <strong>strictement nécessaires</strong> à son
        fonctionnement ; aucun consentement préalable n’est requis pour ceux-ci (article 82 loi Informatique
        et Libertés, exemptions CNIL). Aucun cookie publicitaire ni outil de mesure d’audience n’est utilisé.
      </p>
      <table className="data-table legal-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Finalité</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cookie de session (NextAuth)</td>
            <td>Maintient la connexion des administrateurs et animateurs</td>
            <td>30 jours</td>
          </tr>
          <tr>
            <td>
              <code>sq_identity</code>
            </td>
            <td>Identifiant anonyme du joueur, pour retrouver sa partie après un rafraîchissement</td>
            <td>12 mois</td>
          </tr>
        </tbody>
      </table>
      <p>
        Vous pouvez à tout moment supprimer ces cookies via les paramètres de votre navigateur ; la
        conséquence est la perte de votre session de connexion ou de votre place dans une partie en cours.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos
        données :
      </p>
      <ul>
        <li>Chiffrement HTTPS/TLS sur toutes les communications</li>
        <li>Hachage bcrypt (12 rounds) des mots de passe, verrouillage après échecs répétés</li>
        <li>Isolation entre organisations (chaque organisation ne voit que ses propres données)</li>
        <li>Journal des actions sensibles pour traçabilité</li>
        <li>Séparation production / développement</li>
        <li>Sauvegardes automatiques quotidiennes de la base de données et des médias</li>
      </ul>

      <h2>10. Notification de violation</h2>
      <p>
        En cas de violation de données personnelles susceptible d’entraîner un risque pour vos droits et
        libertés, nous nous engageons à notifier la CNIL dans les 72 heures et à vous en informer dans les
        meilleurs délais conformément aux articles 33 et 34 du RGPD.
      </p>

      <h2>11. Modifications</h2>
      <p>
        Cette politique peut être mise à jour. La date de dernière mise à jour figure en haut de cette page.
        Les modifications substantielles sont notifiées par email aux administrateurs des organisations.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question relative à vos données personnelles : <Mail email={c.dpo.email} />.
      </p>
    </Legal>
  );
}
