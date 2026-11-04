import type { Metadata } from "next";
import Link from "next/link";
import { Building2, GraduationCap, PartyPopper, QrCode, Sparkles, Trophy, Zap } from "lucide-react";
import { FormatsPreview, MomentsFold } from "@/components/site/features";
import { JoinBox } from "@/components/site/join-box";
import { ContactSection } from "@/components/site/contact-section";
import { Marquee } from "@/components/site/marquee";
import { JsonLd } from "@/components/site/json-ld";
import { SwipeRow } from "@/components/site/swipe-row";
import { Advantages, Faq } from "@/components/site/seo-sections";
import { FAQ, QUESTION_COUNT, faqLd, softwareLd } from "@/lib/seo";
import { EVENT_PASS, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "SQuizz : quiz interactif en direct, l’alternative française à Kahoot!" },
};

/** The questions the home page shows first; the others are folded under them (all stay in the page). */
const FIRST = [
  "SQuizz est-il gratuit ?",
  "Les joueurs doivent-ils installer une application ou créer un compte ?",
  "Combien de joueurs peuvent participer à une partie ?",
  "SQuizz est-il une bonne alternative à Kahoot! ?",
  "Où sont hébergées les données et que deviennent-elles ?",
];
const HOME_FAQ = [...FAQ].sort((a, b) => (FIRST.indexOf(a.q) + 1 || 99) - (FIRST.indexOf(b.q) + 1 || 99));

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
          {/* No entrance animation here: this paragraph is what the page is measured on (LCP). */}
          <p className="lead">
            SQuizz est la plateforme française de quiz interactifs en direct : vous projetez le quiz, chacun
            répond depuis son téléphone, sans application. Classement en direct et podium final.
          </p>
          <div className="row hero-in" style={{ marginTop: 26, ["--d" as string]: "560ms" }}>
            <Link className="button" href="/inscription" data-conversion="signup_cta_click">
              <Sparkles size={18} /> Créer mon espace gratuit
            </Link>
            <Link className="button secondary" href="/tarifs">
              Voir les offres
            </Link>
          </div>
          <p className="hero-price">
            <b>Gratuit</b> pour essayer, sans carte bancaire · offres dès {PLANS.STARTER.price} € / mois ·{" "}
            {EVENT_PASS.label} {EVENT_PASS.price} € sans abonnement
          </p>
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
          "Textes à trous",
          "Appariement",
          "Puzzle",
          "Sondage",
          "Nuage de mots",
          "Brainstorming",
          "Roue de tirage",
          "Mode équipes",
          "Quiz par IA",
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
            <p>Écrivez votre quiz, importez-le depuis Excel ou laissez l’IA le rédiger.</p>
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
          <span className="hint">{QUESTION_COUNT} types de questions, des diapos et une roue</span>
        </div>
        <FormatsPreview />
        <MomentsFold />
      </section>

      <section className="audiences" aria-labelledby="audiences-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">POUR QUI ?</p>
            <h2 id="audiences-title">Une salle, un écran, et c’est parti</h2>
          </div>
        </div>
        <SwipeRow className="audience-grid" label="Pour qui" stagger="pop">
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
        </SwipeRow>
      </section>

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
          <h2>Prêt pour votre premier quiz&nbsp;?</h2>
          <p>
            Créez votre espace en une minute, invitez vos animateurs et partagez vos quiz avec toute l’équipe.
          </p>
        </div>
        <div className="cta-points">
          <span>
            <Zap size={18} /> Gratuit, sans carte bancaire
          </span>
          <Link className="button" href="/inscription" data-conversion="signup_cta_click">
            <Sparkles size={18} /> Créer mon espace gratuit
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
        <Faq items={HOME_FAQ} shown={FIRST.length} />
      </section>
      <div data-reveal="up">
        <ContactSection />
      </div>
      <JsonLd data={softwareLd} />
      <JsonLd data={faqLd} />
    </>
  );
}
