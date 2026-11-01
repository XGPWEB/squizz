import Link from "next/link";
import { Building2, GraduationCap, PartyPopper, QrCode, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { questionTypes, slideLayouts } from "@/lib/question";
import { TypePreview, LayoutPreview } from "@/components/squizz/type-preview";
import { JoinBox } from "@/components/site/join-box";
import { ContactSection } from "@/components/site/contact-section";
import { Marquee } from "@/components/site/marquee";
import { JsonLd } from "@/components/site/json-ld";
import { Advantages, Faq } from "@/components/site/seo-sections";
import { faqLd, softwareLd } from "@/lib/seo";
import { EVENT_PASS, PLANS } from "@/lib/plans";

const featured = ["quiz", "truefalse", "blindtest", "puzzle", "wordcloud", "pin"] as const;

export default function HomePage() {
  return (
    <>
      <section className="intro hero">
        <div className="hero-decor" aria-hidden="true">
          <span className="shape shape-star" data-parallax="0.25">
            ✦
          </span>
          <span className="shape shape-circle" data-parallax="-0.18" />
          <span className="shape shape-bolt" data-parallax="0.15">
            <Zap />
          </span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow hero-in" style={{ ["--d" as string]: "0ms" }}>
            LE SAVOIR, ÇA SE JOUE.
          </p>
          <h1>
            <span className="hero-line hero-in" style={{ ["--d" as string]: "120ms" }}>
              Moins de blabla.
            </span>
            <br />
            <span className="hero-line hero-in" style={{ ["--d" as string]: "260ms" }}>
              Plus de <span className="wiggle">défis.</span>
            </span>
          </h1>
          <p className="lead hero-in" style={{ ["--d" as string]: "420ms" }}>
            Créez un quiz en quelques minutes, projetez-le et laissez chacun répondre depuis son téléphone.
            Classement en direct, podium final, zéro application à installer.
          </p>
          <div className="row hero-in" style={{ marginTop: 26, ["--d" as string]: "560ms" }}>
            <Link className="button" href="/inscription" data-conversion="signup_cta_click">
              <Sparkles size={18} /> Créer mon espace gratuit
            </Link>
            <Link className="button secondary" href="/tarifs">
              Voir les offres
            </Link>
          </div>
        </div>
        <div className="hero-join" data-reveal="pop">
          {/* Two shapes pinned to the join box itself, so they stick out of its corners at every width. */}
          <span className="shape shape-square" data-parallax="0.06" aria-hidden="true" />
          <span className="shape shape-question" data-parallax="-0.05" aria-hidden="true">
            ?
          </span>
          <JoinBox />
        </div>
      </section>

      <Marquee
        items={[
          "Quiz",
          "Vrai ou faux",
          "Blind test",
          "Curseur",
          "Puzzle",
          "Sondage",
          "Nuage de mots",
          "Place le pin’s",
          "Brainstorming",
          "Diapos",
          "Podium",
        ]}
      />

      <section className="steps" aria-labelledby="steps-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">EN TROIS TEMPS</p>
            <h2 id="steps-title">Comment ça marche ?</h2>
          </div>
        </div>
        <ol className="step-list" data-stagger="up">
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
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">TESTER, SONDER, PRÉSENTER</p>
            <h2 id="features-title">Tous les formats pour faire participer</h2>
          </div>
          <span className="hint">{questionTypes.length - 1} types de questions</span>
        </div>
        <div className="type-grid showcase" data-stagger="zoom">
          {featured.map((id) => {
            const t = questionTypes.find((x) => x.id === id)!;
            return (
              <article key={id}>
                <TypePreview type={id} />
                <h3>{t.label}</h3>
                <span>{t.hint}</span>
              </article>
            );
          })}
        </div>
        <p className="feature-more">
          Et aussi : réponse libre, curseur, sondage, échelle, NPS, place le pin’s, question ouverte,
          brainstorming…
        </p>
        <div className="type-grid showcase slides-showcase" data-stagger="up">
          {slideLayouts.slice(0, 3).map((l) => (
            <article key={l.id}>
              <LayoutPreview layout={l.id} />
              <h3>Diapo · {l.label}</h3>
              <span>{l.hint}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="audiences" aria-labelledby="audiences-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">POUR QUI ?</p>
            <h2 id="audiences-title">Une salle, un écran, et c’est parti</h2>
          </div>
        </div>
        <div className="audience-grid" data-stagger="pop">
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
            <p>
              Soirées quiz, associations, mariages : jusqu’à {PLANS.PREMIUM.maxPlayersPerGame} joueurs par
              partie avec l’offre Premium.
            </p>
          </article>
        </div>
      </section>

      <Marquee
        tone="acid"
        items={[
          `Jusqu’à ${PLANS.PREMIUM.maxPlayersPerGame} joueurs avec Premium`,
          "Sans application",
          "Classement en direct",
          "QR code",
          "Gratuit pour démarrer",
          `${EVENT_PASS.label} : ${EVENT_PASS.price} € sans abonnement`,
        ]}
      />

      <section className="advantages" aria-labelledby="advantages-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">POURQUOI SQUIZZ ?</p>
            <h2 id="advantages-title">L’alternative française à Kahoot!</h2>
          </div>
          <Link className="hint" href="/alternative-kahoot">
            Voir la comparaison →
          </Link>
        </div>
        <Advantages />
      </section>

      <section className="cta-band" data-reveal="zoom">
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
          <Link className="button" href="/inscription" data-conversion="signup_cta_click">
            Créer mon espace
          </Link>
        </div>
      </section>
      <section className="faq-section" aria-labelledby="faq-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title">Questions fréquentes</h2>
          </div>
        </div>
        <Faq />
      </section>
      <div data-reveal="up">
        <ContactSection />
      </div>
      <JsonLd data={softwareLd} />
      <JsonLd data={faqLd} />
    </>
  );
}
