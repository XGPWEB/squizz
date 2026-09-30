/** Player and game screens: no site header or footer, only the game itself. */
export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenu" className="play-shell">
      {children}
    </main>
  );
}
