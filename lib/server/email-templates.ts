import { COMPANY_INFO } from "@/lib/company-info";
import { appUrl } from "./mail";

/**
 * SQuizz-branded emails: cream background, black frame, acid-green button, pink accent.
 * Email clients ignore stylesheets and web fonts, so everything is inline, in tables,
 * with Impact / Arial standing in for Anton.
 */
const C = { acid: "#d2ff36", pink: "#ff6abb", cream: "#fff9ed", ink: "#141413", muted: "#55514b" };

export type Email = { subject: string; text: string; html: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  cta?: { label: string; url: string };
  note?: string;
}) {
  const site = appUrl();
  const button = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td style="background:${C.acid};border:2px solid ${C.ink};border-radius:12px;box-shadow:4px 4px 0 ${C.ink}">
        <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:14px 26px;font:800 16px Arial,Helvetica,sans-serif;color:${C.ink};text-decoration:none">${esc(opts.cta.label)} &rarr;</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font:13px/1.5 Arial,Helvetica,sans-serif;color:${C.muted}">Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="${esc(opts.cta.url)}" style="color:#3445ff;word-break:break-all">${esc(opts.cta.url)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 0 22px">
      <a href="${site}" style="text-decoration:none"><span style="display:inline-block;background:${C.ink};color:${C.acid};font:400 30px Impact,'Arial Black',Arial,sans-serif;letter-spacing:0.5px;padding:8px 16px;border-radius:9px">SQuizz<span style="color:${C.pink}">.</span></span></a>
    </td></tr>
    <tr><td style="background:#ffffff;border:3px solid ${C.ink};border-radius:20px;box-shadow:7px 7px 0 ${C.pink};padding:34px 32px">
      <p style="margin:0 0 10px;font:700 12px/1.4 'Courier New',monospace;letter-spacing:2px;color:${C.ink}">${esc(opts.eyebrow.toUpperCase())}</p>
      <h1 style="margin:0 0 18px;font:400 34px/1.1 Impact,'Arial Black',Arial,sans-serif;color:${C.ink}">${esc(opts.title)}</h1>
      <div style="font:16px/1.6 Arial,Helvetica,sans-serif;color:${C.ink}">${opts.body}</div>
      ${button}
      ${opts.note ? `<p style="margin:22px 0 0;padding:12px 14px;background:${C.cream};border:2px solid ${C.ink};border-radius:10px;font:13px/1.5 Arial,Helvetica,sans-serif;color:${C.ink}">${opts.note}</p>` : ""}
    </td></tr>
    <tr><td style="padding:22px 6px 0;font:700 11px/1.7 'Courier New',monospace;letter-spacing:1px;color:${C.ink}">
      SQUIZZ · ON JOUE ENSEMBLE. ON BRILLE CHACUN SON TOUR.<br>
      <span style="font-weight:400;color:${C.muted}">${esc(COMPANY_INFO.editor.name)} · <a href="mailto:${COMPANY_INFO.editor.email}" style="color:${C.muted}">${COMPANY_INFO.editor.email}</a> · <a href="${site}" style="color:${C.muted}">${site.replace(/^https?:\/\//, "")}</a> · <a href="${site}/confidentialite" style="color:${C.muted}">Confidentialité</a></span>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const roleName = (role: string) => (role === "ORG_ADMIN" ? "administrateur" : "animateur");

export function invitationEmail(o: {
  organization: string;
  inviter: string;
  role: string;
  link: string;
  days: number;
}): Email {
  const subject = `Invitation à rejoindre ${o.organization} sur SQuizz`;
  return {
    subject,
    text: `${o.inviter} vous invite à rejoindre « ${o.organization} » sur SQuizz en tant que ${roleName(o.role)}.\n\nCréez votre compte ici (lien valable ${o.days} jours) :\n${o.link}\n`,
    html: layout({
      preheader: `${o.inviter} vous invite à créer vos quiz avec ${o.organization}.`,
      eyebrow: "Vous êtes invité",
      title: "Rejoignez l’équipe !",
      body: `<p style="margin:0 0 12px"><strong>${esc(o.inviter)}</strong> vous invite à rejoindre <strong>${esc(o.organization)}</strong> sur SQuizz en tant que <strong>${roleName(o.role)}</strong>.</p>
             <p style="margin:0">Créez vos quiz, lancez des parties en direct et faites jouer votre public depuis son téléphone.</p>`,
      cta: { label: "Créer mon compte", url: o.link },
      note: `Ce lien est valable ${o.days} jours. Si vous ne vous attendiez pas à cette invitation, ignorez simplement cet email.`,
    }),
  };
}

export function resetEmail(o: { name: string; link: string; minutes: number }): Email {
  const subject = "Réinitialisation de votre mot de passe SQuizz";
  return {
    subject,
    text: `Bonjour ${o.name},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable ${o.minutes} minutes) :\n${o.link}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez cet email.`,
    html: layout({
      preheader: "Choisissez un nouveau mot de passe pour votre compte SQuizz.",
      eyebrow: "Mot de passe",
      title: "Nouveau mot de passe",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Vous avez demandé à changer le mot de passe de votre compte SQuizz. Cliquez sur le bouton pour en choisir un nouveau.</p>`,
      cta: { label: "Choisir mon mot de passe", url: o.link },
      note: `Ce lien est valable ${o.minutes} minutes et ne sert qu’une fois. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : votre mot de passe actuel reste inchangé.`,
    }),
  };
}

export function contactEmail(o: { name: string; email: string; subject: string; message: string }): Email {
  const subject = `[SQuizz] ${o.subject} — ${o.name}`;
  const site = appUrl();
  return {
    subject,
    text: `Nouveau message depuis le formulaire de contact de SQuizz.\n\nNom : ${o.name}\nEmail : ${o.email}\nSujet : ${o.subject}\n\n${o.message}\n`,
    html: layout({
      preheader: `${o.name} : ${o.message.slice(0, 90)}`,
      eyebrow: "Formulaire de contact",
      title: o.subject,
      body: `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font:15px/1.6 Arial,Helvetica,sans-serif">
               <tr><td style="padding:0 14px 0 0;color:${C.muted}">Nom</td><td><strong>${esc(o.name)}</strong></td></tr>
               <tr><td style="padding:0 14px 0 0;color:${C.muted}">Email</td><td><a href="mailto:${esc(o.email)}" style="color:#3445ff">${esc(o.email)}</a></td></tr>
             </table>
             <div style="padding:16px;background:${C.cream};border:2px solid ${C.ink};border-radius:12px;white-space:pre-wrap">${esc(o.message)}</div>`,
      cta: { label: "Voir dans le super-admin", url: `${site}/admin/messages` },
      note: "Répondez directement à cet email : la réponse part vers l’expéditeur.",
    }),
  };
}
