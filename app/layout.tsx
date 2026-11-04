import type { Metadata } from "next";
import "@fontsource/anton/latin-400.css";
import "@fontsource/permanent-marker/latin-400.css";
// The sober theme of the games (lib/brand.ts); a font file is only downloaded where it is used.
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/inter-tight/wght.css";
import "./globals.css";
import { CookieConsent } from "@/components/site/cookie-consent";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://www.squizz.fun"),
  title: {
    default: "SQuizz : quiz interactif en direct, l’alternative française à Kahoot!",
    template: "%s · SQuizz",
  },
  description:
    "Quiz interactifs en direct, joués sur téléphone sans application. L’alternative française à Kahoot! : essai gratuit, sans engagement, données en Europe.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "SQuizz",
    locale: "fr_FR",
    type: "website",
    title: "SQuizz : quiz interactif en direct, l’alternative française à Kahoot!",
    description: "Créez un quiz, projetez-le et faites jouer tout le monde depuis son téléphone.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Turns the animations on before the first paint, so the headline never flashes. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')}catch(e){}",
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
