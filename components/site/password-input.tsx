"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password field with an eye button to show or hide what was typed. */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        title={visible ? "Masquer" : "Afficher"}
      >
        {visible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </span>
  );
}
