"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";

/** Code entry on the homepage; the nickname is asked on /jouer. */
export function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="join"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/jouer?code=${code}`);
      }}
    >
      <div className="icon-box">
        <Zap />
      </div>
      <h2>T’es dans la partie ?</h2>
      <p>Entrez le code affiché par votre animateur.</p>
      <label htmlFor="code">Code de la partie</label>
      <input
        id="code"
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        pattern="[0-9]{6}"
        required
        maxLength={6}
      />
      <button className="button dark" type="submit">
        Rejoindre la partie
      </button>
      <span className="hint">Un pseudo suffit pour participer.</span>
    </form>
  );
}
