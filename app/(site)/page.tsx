import Link from "next/link";
import { Building2, GraduationCap, PartyPopper, QrCode, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { questionTypes, slideLayouts } from "@/lib/question";
import { TypePreview, LayoutPreview } from "@/components/squizz/type-preview";
import { JoinBox } from "@/components/site/join-box";

const featured = ["quiz", "truefalse", "slider", "puzzle", "wordcloud", "pin"] as const;

export default function HomePage() {
  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">LE SAVOIR, ÇA SE JOUE.</p>
          <h1>
            Moins de blabla.
            <br />
            Plus de <span>défis.</span>
          </h1>
          <p className="lead">
            Créez un quiz en quelques minutes, projetez-le et laissez chacun répondre depuis son téléphone.
            Classement en direct, podium final, zéro application à installer.
          </p>
          <div className="row" style={{ marginTop: 26 }}>
            <Link className="button" href="/inscription">
              <Sparkles size={18} /> Créer mon espace gratuit
            </Link>
            <Link className="button secondary" href="/tarifs">
              Voir les offres
            </Link>
          </div>
        </div>
        <JoinBox />
      </section>

      <section className="steps" aria-labelledby="steps-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EN TROIS TEMPS</p>
            <h2 id="steps-title">Comment ça marche ?</h2>
          </div>
        </div>
        <ol className="step-list">
          <li>
            <span className="step-icon">
              <Sparkles />
            </span>
            <h3>Préparez</h3>
            <p>Choisissez parmi 14 types de questions et 6 diapos, ajoutez vos images et vidéos.</p>
          </li>
          <li>
            <span className="step-icon">
              <QrCode />
            </span>
            <h3>Invitez</h3>
            <p>Un code à six chiffres et un QR code : les joueurs rejoignent en une seconde, sans compte.</p>
          </li>
          <li>
            <span className="step-icon">
              <Trophy />
            </span>
            <h3>Jouez</h3>
            <p>Chrono, points de rapidité, classement après chaque question et podium final.</p>
          </li>
        </ol>
      </section>

      <section id="fonctionnalites" aria-labelledby="features-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TESTER, SONDER, PRÉSENTER</p>
            <h2 id="features-title">Tous les formats pour faire participer</h2>
          </div>
          <span className="hint">{questionTypes.length} types de questions</span>
        </div>
        <div className="type-grid showcase">
          {featured.map((id) => {
            const t = questionTypes.find((x) => x.id === id)!;
            return (
              <article key={id}>
                <TypePreview type={id} />
                <strong>{t.label}</strong>
                <span>{t.hint}</span>
              </article>
            );
          })}
        </div>
        <p className="feature-more">
          Et aussi : réponse libre, sondage, échelle, NPS, place le pin’s, question ouverte, brainstorming…
        </p>
        <div className="type-grid showcase slides-showcase">
          {slideLayouts.slice(0, 3).map((l) => (
            <article key={l.id}>
              <LayoutPreview layout={l.id} />
              <strong>Diapo · {l.label}</strong>
              <span>{l.hint}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="audiences" aria-labelledby="audiences-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">POUR QUI ?</p>
            <h2 id="audiences-title">Une salle, un écran, et c’est parti</h2>
          </div>
        </div>
        <div className="audience-grid">
          <article>
            <Building2 />
            <h3>Entreprises</h3>
            <p>Séminaires, onboarding, formations : vérifiez ce qui a été retenu et animez vos réunions.</p>
          </article>
          <article>
            <GraduationCap />
            <h3>Écoles et formateurs</h3>
            <p>Révisions en classe, évaluations ludiques, sondages d’opinion en fin de séance.</p>
          </article>
          <article>
            <PartyPopper />
            <h3>Événements</h3>
            <p>Soirées quiz, associations, mariages : jusqu’à 100 joueurs par partie.</p>
          </article>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Votre équipe, vos animateurs, vos quiz.</h2>
          <p>
            Invitez vos animateurs, partagez une bibliothèque de quiz commune et gérez les droits de chacun
            depuis votre espace.
          </p>
        </div>
        <div className="cta-points">
          <span>
            <Users size={18} /> Rôles administrateur et animateur
          </span>
          <span>
            <Zap size={18} /> Démarrage gratuit, sans carte bancaire
          </span>
          <Link className="button" href="/inscription">
            Créer mon espace
          </Link>
        </div>
      </section>
    </>
  );
}
