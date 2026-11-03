import Link from "next/link";
import { Building2, GraduationCap, PartyPopper, QrCode, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { FeatureGroups, FeatureNav, TypeShowcase } from "@/components/site/features";
import { JoinBox } from "@/components/site/join-box";
import { ContactSection } from "@/components/site/contact-section";
import { Marquee } from "@/components/site/marquee";
import { JsonLd } from "@/components/site/json-ld";
import { Advantages, Faq } from "@/components/site/seo-sections";
import { QUESTION_COUNT, faqLd, softwareLd } from "@/lib/seo";
import { EVENT_PASS, PLANS } from "@/lib/plans";

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
            <p>
              {QUESTION_COUNT} types de questions, des diapos et une roue : écrivez votre quiz, importez-le
              depuis Excel ou laissez l’IA le rédiger.
            </p>
          </li>
          <li>
            <span className="step-icon">
              <QrCode />
            </span>
            <h3>Invitez</h3>
            <p>
              Un code à six chiffres et un QR code : les joueurs rejoignent en une seconde, sans compte, seuls
              ou en équipes.
            </p>
          </li>
          <li>
            <span className="step-icon">
              <Trophy />
            </span>
            <h3>Jouez</h3>
            <p>
              Chrono, points de rapidité, classement et podium, pilotés depuis votre téléphone. Les résultats
              restent ensuite dans votre espace.
            </p>
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
        <FeatureNav />
        <TypeShowcase />
      </section>

      <section className="features-more" aria-labelledby="features-more-title">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">AVANT, PENDANT, APRÈS</p>
            <h2 id="features-more-title">Tout ce qu’il faut pour animer</h2>
          </div>
        </div>
        <FeatureGroups />
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
