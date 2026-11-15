"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

/**
 * Code entry on the homepage; the nickname is asked on /jouer. The field is uncontrolled and read when the
 * form is sent: a code typed before the page's script is ready stays on screen, and is the one that is sent
 * (a controlled field went back to empty at hydration). Before the script, the form works natively (GET).
 */
export function JoinBox() {
  const router = useRouter();
  return (
    <form
      className="join"
      action="/jouer"
      onSubmit={(e) => {
        e.preventDefault();
        const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\D/g, "");
        router.push(`/jouer?code=${code}`);
      }}
    >
      <div className="icon-box">
        <Zap />
      </div>
      <p className="join-title">T’es dans la partie ?</p>
      <p>Entre le code affiché par ton animateur.</p>
      <label htmlFor="code">Code de la partie</label>
      <input
        id="code"
        name="code"
        placeholder="000000"
        autoComplete="off"
        onInput={(e) => {
          const field = e.currentTarget;
          if (/\D/.test(field.value)) field.value = field.value.replace(/\D/g, "");
        }}
        inputMode="numeric"
        pattern="[0-9]{6}"
        required
        maxLength={6}
      />
      <button className="button dark" type="submit">
        Rejoindre la partie
      </button>
      <span className="hint">
        Pas de code ?{" "}
        <Link href="/demo" className="demo-link" data-conversion="demo_cta_click">
          Joue une partie d’essai <span aria-hidden="true">→</span>
        </Link>
      </span>
    </form>
  );
}
