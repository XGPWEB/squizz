import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { COMPANY_INFO } from "@/lib/company-info";
import { turnstileSiteKey } from "@/lib/server/turnstile";
import { shareGraph } from "@/lib/seo";

const DESCRIPTION =
  "30 minutes en visio pour découvrir SQuizz avec votre cas : séminaire, formation, réunion publique. Gratuit et sans engagement, vous jouez depuis votre téléphone.";

export const metadata: Metadata = {
  alternates: { canonical: "/demo-visio" },
  title: "Réserver une démo de SQuizz en visio",
  description: DESCRIPTION,
  openGraph: shareGraph({
    title: "Une démo de SQuizz en visio",
    description: DESCRIPTION,
    url: "/demo-visio",
  }),
};

/** What the visio covers: three short stickers, no more. */
const AGENDA = [
  { time: "5 min", text: "Votre événement, votre public" },
  { time: "15 min", text: "Une partie en direct : vous jouez sur votre téléphone" },
  { time: "10 min", text: "Vos questions, l’offre qui vous va" },
];

/** Booking a visio demo: pick up to three slots, Pressweb confirms one by email with the link. */
export default function DemoVisioPage() {
  return (
    <>
      <div className="page-heading" data-reveal="up">
        <p className="eyebrow">DÉMO EN VISIO · 30 MIN · GRATUITE</p>
        <h1>
          On vous montre <span>tout</span>
        </h1>
        <p className="lead">
          Choisissez vos créneaux : on vous confirme par e-mail avec le lien de la visio.
        </p>
      </div>

      <div className="demo-visio">
        <aside className="demo-visio-agenda" data-stagger="left">
          {AGENDA.map((a) => (
            <p key={a.time}>
              <b>{a.time}</b> {a.text}
            </p>
          ))}
          <span className="demo-visio-or">
            Plutôt seul ?{" "}
            <Link href="/demo" data-conversion="demo_cta_click">
              <Play size={14} aria-hidden /> Jouer la démo
            </Link>
          </span>
        </aside>
        <div className="demo-visio-form" data-reveal="up">
          <ContactForm siteKey={turnstileSiteKey()} email={COMPANY_INFO.editor.email} demo />
        </div>
      </div>
    </>
  );
}
