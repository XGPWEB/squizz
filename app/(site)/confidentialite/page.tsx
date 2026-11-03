import type { Metadata } from "next";
import { Legal, Mail } from "@/components/site/legal";
import { CookieSettingsLink } from "@/components/site/cookie-consent";
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

      <h2>1. Qui est responsable de vos données</h2>
      <p>
        <strong>{c.editor.name}</strong>, éditeur du Service, est responsable du traitement pour les comptes
        des organisations, le formulaire de contact et la sécurité du Service. Référent pour les données
        personnelles : {c.dpo.name}, joignable à <Mail email={c.dpo.email} />.
      </p>
      <p>
        Pour les données des <strong>joueurs</strong> et des <strong>membres invités</strong>, l’organisation
        qui utilise SQuizz décide de l’usage de ces données (contenu des quiz, contexte de la partie) : elle
        en est responsable, et {c.editor.name} agit pour son compte en tant que sous-traitant, dans les
        conditions de l’article 12 des <a href="/cgu#donnees">CGU</a>.
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
        <li>
          Les résultats de la partie (pseudo, réponses, score et rang), gardés pour l’organisation qui l’anime
          afin qu’elle puisse les consulter et les exporter
        </li>
        <li>Un identifiant anonyme aléatoire (cookie) pour le reconnaître pendant la partie</li>
      </ul>
      <p>
        <strong>Important</strong> : l’organisation qui anime la partie choisit le contenu des quiz et le
        contexte de jeu. Elle informe ses participants de l’usage qui est fait de leurs réponses (par exemple
        lors d’une formation ou d’un sondage interne).
      </p>
      <h3>2.3 Formulaire de contact</h3>
      <ul>
        <li>Nom, email, sujet et contenu du message que vous nous envoyez</li>
      </ul>
      <h3>2.4 Données techniques</h3>
      <ul>
        <li>
          Adresse IP (limitation des tentatives de connexion, d’inscription et d’entrée dans les parties)
        </li>
        <li>Journaux du serveur web (adresse IP, page demandée, date), conservés 14 jours</li>
        <li>Journal des actions sensibles (invitations, changements de rôle, suspensions, suppressions)</li>
      </ul>
      <h3>2.5 Mesure d’audience (seulement si vous l’acceptez)</h3>
      <ul>
        <li>
          Pages publiques consultées, provenance de la visite, ville approximative, type d’appareil, clics sur
          les boutons d’inscription et d’offres, envoi des formulaires d’inscription et de contact (sans leur
          contenu)
        </li>
        <li>
          Rien n’est mesuré pendant une partie ni dans les espaces connectés : les joueurs ne sont pas
          concernés
        </li>
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
          <strong>Sécurité</strong> : limitation des tentatives de connexion, anti-robot, journal d’audit
        </li>
        <li>
          <strong>Support</strong> : réponse aux demandes du Client
        </li>
        <li>
          <strong>Communication</strong> : emails transactionnels (invitation, réinitialisation du mot de
          passe, réponse à vos messages)
        </li>
        <li>
          <strong>Mesure d’audience</strong> (si vous l’acceptez) : savoir combien de personnes visitent le
          site, comment elles le trouvent et quelles pages les intéressent
        </li>
      </ul>

      <h2>4. Bases légales du traitement</h2>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (art. 6.1.b RGPD) : pour fournir le Service
        </li>
        <li>
          <strong>Obligation légale</strong> (art. 6.1.c RGPD) : conservation des factures des offres
          payantes, si l’une d’elles est souscrite (10 ans, Code de commerce)
        </li>
        <li>
          <strong>Consentement</strong> (art. 6.1.a RGPD) : traitement de votre message envoyé par le
          formulaire de contact (case à cocher), que vous pouvez retirer à tout moment par email ; mesure
          d’audience et vidéos YouTube, que vous pouvez retirer à tout moment depuis « Gérer les cookies »
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
            <td>Parties en cours, pseudos et réponses des joueurs</td>
            <td>24 heures après la création de la partie, puis suppression automatique</td>
          </tr>
          <tr>
            <td>Résultats d’une partie (pseudos, réponses, scores)</td>
            <td>
              12 mois après la partie, puis suppression automatique ; l’organisation peut les supprimer avant
            </td>
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
            <td>Messages du formulaire de contact</td>
            <td>3 ans après leur réception</td>
          </tr>
          <tr>
            <td>Journal des actions sensibles</td>
            <td>12 mois</td>
          </tr>
          <tr>
            <td>Sauvegardes (base de données et médias)</td>
            <td>
              7 jours, plus une copie hebdomadaire gardée 5 semaines : une donnée supprimée peut y subsister
              jusqu’à 5 semaines
            </td>
          </tr>
          <tr>
            <td>Inscriptions dont l’adresse e-mail n’a jamais été confirmée</td>
            <td>7 jours après l’inscription (organisation et compte supprimés)</td>
          </tr>
          <tr>
            <td>Compteurs anti-abus, invitations, liens de mot de passe et de confirmation expirés</td>
            <td>Supprimés chaque nuit après expiration</td>
          </tr>
          <tr>
            <td>Statistiques de mesure d’audience (chez Google)</td>
            <td>2 mois, puis suppression automatique</td>
          </tr>
          <tr>
            <td>Factures (offres payantes, si souscrites)</td>
            <td>10 ans (obligation comptable)</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Avec qui nous partageons vos données</h2>
      <p>Nous utilisons les sous-traitants suivants pour fournir le Service :</p>
      <ul>
        <li>
          <strong>{c.host.name}</strong> — location du serveur (VPS) situé à Francfort (Allemagne, Union
          européenne), qui héberge l’application, la base de données, les médias et les sauvegardes
        </li>
        <li>
          <strong>Resend, Inc.</strong> (États-Unis) — envoi des emails transactionnels (invitations, mot de
          passe oublié) et transmission des messages du formulaire de contact
        </li>
        <li>
          <strong>Cloudflare, Inc.</strong> (États-Unis) — vérification anti-robot (Turnstile) du formulaire
          de contact, qui reçoit votre adresse IP ; sans cookie publicitaire
        </li>
        <li>
          <strong>Stripe Payments Europe, Ltd.</strong> (Irlande) — paiement des abonnements : Stripe reçoit
          le nom de l’organisation, l’adresse email de l’administrateur et les données de carte bancaire, que
          SQuizz ne voit ni ne conserve jamais
        </li>
        <li>
          <strong>Google Ireland Ltd.</strong> (Irlande), avec sa maison mère Google LLC (États-Unis) — mesure
          d’audience des pages publiques (Google Analytics), uniquement si vous l’acceptez : Google reçoit
          votre adresse IP et les informations listées au 2.5, sans partage à des fins publicitaires
        </li>
      </ul>
      <p>
        Les transferts vers les États-Unis (Resend, Cloudflare, Google, et Stripe pour certains traitements)
        reposent sur le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou, à défaut,
        sur les clauses contractuelles types de la Commission européenne. Aucune donnée n’est vendue à des
        tiers.
      </p>
      <p>
        <strong>Vidéos YouTube</strong> : lorsqu’un quiz contient une vidéo YouTube, elle n’est chargée
        qu’avec votre accord (voir « Cookies » ci-dessous), en mode « confidentialité renforcée »
        (youtube-nocookie.com). Google reçoit alors votre adresse IP et peut utiliser les cookies et le
        stockage local de votre navigateur, selon sa propre politique de confidentialité.
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
        Depuis <strong>Mon compte</strong>, vous pouvez vous-même exporter vos données (format JSON) et
        supprimer votre compte. Pour toute autre demande, écrivez-nous à <Mail email={c.dpo.email} /> : nous
        répondons sous un mois. Les joueurs n’ont pas de compte : la partie est effacée automatiquement 24
        heures après, et ses résultats (pseudos et réponses) 12 mois après ; pour une demande avant ce délai,
        adressez-vous à l’organisation qui anime la partie, qui peut supprimer ces résultats, ou à nous.
      </p>

      <h2 id="cookies">8. Cookies</h2>
      <p>
        Le Service dépose des cookies <strong>strictement nécessaires</strong> à son fonctionnement ; aucun
        consentement préalable n’est requis pour ceux-ci (article 82 loi Informatique et Libertés, exemptions
        CNIL). Aucun cookie publicitaire n’est utilisé.
      </p>
      <p>
        <strong>Votre accord est demandé</strong> pour deux services fournis par des tiers. La{" "}
        <strong>mesure d’audience</strong> (Google Analytics) ne fonctionne que sur les pages publiques du
        site : tant que vous n’avez pas accepté, rien n’est chargé ni transmis à Google, et si vous retirez
        votre accord, elle s’arrête et ses cookies sont supprimés. Les <strong>vidéos YouTube</strong>{" "}
        insérées dans certains quiz ne sont pas chargées non plus avant votre accord, et rien n’est transmis à
        YouTube ; vous pouvez accepter pour une seule vidéo, pour toutes, ou refuser. Refuser est aussi simple
        qu’accepter et n’empêche pas d’utiliser le Service. Votre choix est conservé 6 mois sur votre
        appareil, puis redemandé, et vous pouvez le modifier à tout moment :{" "}
        <CookieSettingsLink className="link-button" />.
      </p>
      <p>
        L’anti-robot du formulaire de contact (Cloudflare Turnstile) n’est chargé que lorsque vous commencez à
        utiliser ce formulaire ; il sert uniquement à sa sécurité.
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
            <td>
              <code>__Secure-next-auth.session-token</code>
            </td>
            <td>Maintient la connexion des administrateurs et animateurs</td>
            <td>30 jours</td>
          </tr>
          <tr>
            <td>
              <code>__Host-next-auth.csrf-token</code>, <code>__Secure-next-auth.callback-url</code>
            </td>
            <td>Protection du formulaire de connexion et page de retour après connexion</td>
            <td>Session du navigateur</td>
          </tr>
          <tr>
            <td>
              <code>sq_identity</code>
            </td>
            <td>Identifiant anonyme du joueur, pour retrouver sa partie après un rafraîchissement</td>
            <td>48 heures</td>
          </tr>
          <tr>
            <td>
              <code>sq_consent</code>
            </td>
            <td>Mémorise votre choix sur les services soumis à accord (mesure d’audience, vidéos YouTube)</td>
            <td>6 mois</td>
          </tr>
          <tr>
            <td>
              <code>_ga</code>, <code>_ga_*</code>
            </td>
            <td>Mesure d’audience Google Analytics, déposés seulement si vous l’acceptez</td>
            <td>13 mois</td>
          </tr>
          <tr>
            <td>
              <code>__Secure-squizz-admin</code>
            </td>
            <td>Réservé au support SQuizz : connexion à l’espace d’administration du Service</td>
            <td>30 jours sans activité (90 jours au plus)</td>
          </tr>
          <tr>
            <td>
              <code>sq_view</code>
            </td>
            <td>Réservé au support SQuizz : consultation d’une organisation à sa demande</td>
            <td>2 heures</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Support SQuizz</strong> : un marqueur <code>sq_no_audience</code>, gardé dans le stockage
        local du navigateur de nos administrateurs, exclut leurs propres visites de la mesure d’audience.
      </p>
      <p>
        Vous pouvez à tout moment supprimer ces cookies via les paramètres de votre navigateur ; la
        conséquence est la perte de votre session de connexion ou de votre place dans une partie en cours.
      </p>
      <p>
        <strong>Brouillons de l’éditeur</strong> : pendant que vous créez ou modifiez un quiz, votre travail
        est gardé dans le stockage local de votre navigateur (jamais envoyé ailleurs avant l’enregistrement),
        rangé par compte et par quiz, pour le retrouver après un rechargement ou une coupure. Il est effacé
        dès l’enregistrement du quiz, et au plus tard après 7 jours. Sur un ordinateur partagé, un autre
        compte ne voit pas vos brouillons ; vous pouvez les supprimer en vidant les données du site dans votre
        navigateur.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos
        données :
      </p>
      <ul>
        <li>Chiffrement HTTPS/TLS sur toutes les communications</li>
        <li>Hachage bcrypt (12 rounds) des mots de passe, limitation des tentatives de connexion</li>
        <li>Isolation entre organisations (chaque organisation ne voit que ses propres données)</li>
        <li>Journal des actions sensibles pour traçabilité</li>
        <li>Séparation production / développement</li>
        <li>Application exécutée sous un compte système dédié, sans droits d’administration</li>
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
        En cas de modification substantielle, nous en informons les administrateurs des organisations par
        email.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question relative à vos données personnelles : <Mail email={c.dpo.email} />.
      </p>
    </Legal>
  );
}
