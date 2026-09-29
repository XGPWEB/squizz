import type { Metadata } from "next";
import "@fontsource/anton/latin-400.css";
import "@fontsource/permanent-marker/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQuizz — Jouez ensemble",
  description: "Créez vos quiz, réunissez vos joueurs et défiez vos méninges.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
