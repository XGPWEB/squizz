import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { COMPANY_INFO } from "@/lib/company-info";
import { turnstileSiteKey } from "@/lib/server/turnstile";
import { ContactForm } from "./contact-form";
import { ContactFold } from "./contact-fold";

/** "Parlons-en" section: contact details on the left, the form folded on the right. */
export function ContactSection() {
  const c = COMPANY_INFO.editor;
  return (
    <section id="contact" className="contact-section" aria-labelledby="contact-title">
      <div className="contact-intro">
        <p className="eyebrow">— PARLONS-EN</p>
        <h2 id="contact-title">
          Un projet <br />
          en tête ?
        </h2>
        <p className="lead">
          Une question, un devis ? Écrivez-nous, on répond vite. Pour une démonstration,{" "}
          <Link href="/demo-visio" data-conversion="demo_visio_click">
            choisissez votre créneau en visio
          </Link>
          .
        </p>
        <ul className="contact-facts">
          <li>
            <Mail size={18} /> <span>EMAIL</span> <a href={`mailto:${c.email}`}>{c.email}</a>
          </li>
          <li>
            <Phone size={18} /> <span>TÉLÉPHONE</span>{" "}
            <a href={`tel:${c.phone.replace(/\s/g, "")}`}>{c.phone}</a>
          </li>
          <li>
            <MapPin size={18} /> <span>ZONE</span> Disponible en France
          </li>
        </ul>
      </div>
      <ContactFold>
        <ContactForm siteKey={turnstileSiteKey()} email={c.email} />
      </ContactFold>
    </section>
  );
}
