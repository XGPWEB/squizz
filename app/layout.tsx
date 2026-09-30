import type { Metadata } from "next";
import "@fontsource/anton/latin-400.css";
import "@fontsource/permanent-marker/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://www.squizz.fun"),
  title: { default: "SQuizz — Le quiz qui se joue ensemble", template: "%s · SQuizz" },
  description:
    "L’alternative française à Kahoot! : créez des quiz interactifs, lancez une partie en direct et faites jouer vos participants depuis leur téléphone, sans application. Essai gratuit sans carte bancaire, offres sans engagement, données hébergées en Europe.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "SQuizz",
    locale: "fr_FR",
    type: "website",
    title: "SQuizz — Le quiz qui se joue ensemble",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
