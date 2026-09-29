import type { Metadata } from "next";
import "@fontsource/anton/latin-400.css";
import "@fontsource/permanent-marker/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://www.squizz.fun"),
  title: { default: "SQuizz — Le quiz qui se joue ensemble", template: "%s · SQuizz" },
  description:
    "Créez des quiz interactifs, lancez une partie en direct et laissez vos participants jouer depuis leur téléphone. Pour les équipes, les écoles et les événements.",
  openGraph: { siteName: "SQuizz", locale: "fr_FR", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
