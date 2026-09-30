import "server-only";
import { COMPANY_INFO } from "@/lib/company-info";
import { appUrl } from "./mail";

/**
 * SQuizz-branded emails: cream background, black frame, acid-green button, pink accent.
 * Email clients ignore stylesheets and web fonts, so everything is inline, in tables,
 * with Impact / Arial standing in for Anton.
 */
const C = {
  acid: "#d2ff36",
  pink: "#ff6abb",
  electric: "#3445ff",
  orange: "#ff8018",
  cream: "#fff9ed",
  ink: "#141413",
  muted: "#55514b",
};

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
  const stripe = [C.electric, C.acid, C.pink, C.orange]
    .map((c) => `<td height="8" style="background:${c};font-size:0;line-height:0">&nbsp;</td>`)
    .join("");
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 0 22px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><a href="${site}" style="text-decoration:none"><span style="display:inline-block;background:${C.ink};color:${C.acid};font:400 30px Impact,'Arial Black',Arial,sans-serif;letter-spacing:0.5px;padding:8px 16px;border-radius:9px">SQuizz<span style="color:${C.pink}">.</span></span></a></td>
        <td align="right" style="font:400 15px 'Comic Sans MS','Marker Felt',cursive;color:#3445ff">On joue ensemble !</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border:3px solid ${C.ink};border-radius:20px;box-shadow:7px 7px 0 ${C.pink};overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:17px 17px 0 0;overflow:hidden"><tr>${stripe}</tr></table>
      <div style="padding:30px 32px 34px">
      <p style="margin:0 0 10px"><span style="display:inline-block;background:${C.ink};color:${C.acid};padding:5px 10px;border-radius:6px;font:700 12px/1.4 'Courier New',monospace;letter-spacing:2px">${esc(opts.eyebrow.toUpperCase())}</span></p>
      <h1 style="margin:0 0 18px;font:400 34px/1.1 Impact,'Arial Black',Arial,sans-serif;color:${C.ink}">${esc(opts.title)}</h1>
      <div style="font:16px/1.6 Arial,Helvetica,sans-serif;color:${C.ink}">${opts.body}</div>
      ${button}
      ${opts.note ? `<p style="margin:22px 0 0;padding:12px 14px;background:${C.cream};border:2px solid ${C.ink};border-radius:10px;font:13px/1.5 Arial,Helvetica,sans-serif;color:${C.ink}">${opts.note}</p>` : ""}
      </div>
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
    text: `${o.inviter} vous invite à rejoindre « ${o.organization} » sur SQuizz en tant qu’${roleName(o.role)}.\n\nCréez votre compte ici (lien valable ${o.days} jours) :\n${o.link}\n`,
    html: layout({
      preheader: `${o.inviter} vous invite à créer vos quiz avec ${o.organization}.`,
      eyebrow: "Vous êtes invité",
      title: "Rejoignez l’équipe !",
      body: `<p style="margin:0 0 12px"><strong>${esc(o.inviter)}</strong> vous invite à rejoindre <strong>${esc(o.organization)}</strong> sur SQuizz en tant qu’<strong>${roleName(o.role)}</strong>.</p>
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

/** Numbered steps in the answer colours, like the game tiles. */
function steps(items: string[]) {
  const colors = [C.electric, C.acid, C.pink, C.orange];
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0 0">${items
    .map(
      (item, i) => `<tr><td style="padding:0 0 10px;vertical-align:top;width:44px">
        <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:${colors[i % 4]};color:${i % 4 === 0 ? "#fff" : C.ink};border:2px solid ${C.ink};border-radius:8px;font:400 17px Impact,'Arial Black',Arial,sans-serif">${i + 1}</span>
      </td><td style="padding:4px 0 10px;font:15px/1.5 Arial,Helvetica,sans-serif;color:${C.ink}">${item}</td></tr>`,
    )
    .join("")}</table>`;
}

const when = () =>
  new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export function welcomeEmail(o: { name: string; organization: string }): Email {
  const site = appUrl();
  return {
    subject: `Bienvenue sur SQuizz, ${o.name} !`,
    text: `Bonjour ${o.name},\n\nVotre espace « ${o.organization} » est prêt sur SQuizz.\n\n1. Créez votre premier quiz (13 types de questions, images, vidéos).\n2. Lancez une partie : un code et un QR code s’affichent à l’écran.\n3. Vos participants jouent depuis leur téléphone, sans application.\n\nCommencer : ${site}/app\n\nUne question ? Répondez simplement à cet email.`,
    html: layout({
      preheader: `Votre espace ${o.organization} est prêt : créez votre premier quiz.`,
      eyebrow: "Bienvenue",
      title: `Bienvenue, ${o.name} !`,
      body: `<p style="margin:0">Votre espace <strong>${esc(o.organization)}</strong> est prêt. Trois étapes et c’est parti :</p>
             ${steps([
               "<strong>Créez votre premier quiz</strong> : 13 types de questions, images, vidéos et diapos.",
               "<strong>Lancez une partie</strong> : un code et un QR code s’affichent sur votre écran.",
               "<strong>Faites jouer la salle</strong> : chacun répond depuis son téléphone, sans application.",
             ])}`,
      cta: { label: "Créer mon premier quiz", url: `${site}/app` },
      note: `Vous êtes sur l’offre <strong>Gratuit</strong> : 5 quiz, 20 joueurs par partie et 3 membres. Une question ? Répondez simplement à cet email.`,
    }),
  };
}

export function memberWelcomeEmail(o: { name: string; organization: string; role: string }): Email {
  const site = appUrl();
  return {
    subject: `Bienvenue dans l’équipe ${o.organization}`,
    text: `Bonjour ${o.name},\n\nVotre compte ${roleName(o.role)} de « ${o.organization} » est créé sur SQuizz.\n\nVotre espace : ${site}/app`,
    html: layout({
      preheader: `Votre compte ${o.organization} est créé.`,
      eyebrow: "Compte créé",
      title: "Vous êtes dans l’équipe !",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Votre compte <strong>${roleName(o.role)}</strong> de <strong>${esc(o.organization)}</strong> est prêt. Retrouvez les quiz de l’équipe, créez les vôtres et lancez vos parties.</p>`,
      cta: { label: "Ouvrir mon espace", url: `${site}/app` },
    }),
  };
}

export function memberJoinedEmail(o: {
  inviter: string;
  member: string;
  email: string;
  organization: string;
}): Email {
  const site = appUrl();
  return {
    subject: `${o.member} a rejoint ${o.organization} sur SQuizz`,
    text: `Bonjour ${o.inviter},\n\n${o.member} (${o.email}) a accepté votre invitation et fait maintenant partie de « ${o.organization} ».\n\nGérer l’équipe : ${site}/app/equipe`,
    html: layout({
      preheader: `${o.member} a accepté votre invitation.`,
      eyebrow: "Équipe",
      title: "Un nouveau membre !",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.inviter)},</p><p style="margin:0"><strong>${esc(o.member)}</strong> (${esc(o.email)}) a accepté votre invitation et fait maintenant partie de <strong>${esc(o.organization)}</strong>.</p>`,
      cta: { label: "Voir l’équipe", url: `${site}/app/equipe` },
    }),
  };
}

export function passwordChangedEmail(o: { name: string }): Email {
  const site = appUrl();
  return {
    subject: "Votre mot de passe SQuizz a été modifié",
    text: `Bonjour ${o.name},\n\nLe mot de passe de votre compte SQuizz a été modifié le ${when()}. Toutes vos sessions ont été déconnectées.\n\nSi vous n’êtes pas à l’origine de ce changement, réinitialisez-le immédiatement : ${site}/mot-de-passe-oublie\net prévenez-nous en répondant à cet email.`,
    html: layout({
      preheader: "Le mot de passe de votre compte vient d’être modifié.",
      eyebrow: "Sécurité",
      title: "Mot de passe modifié",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Le mot de passe de votre compte SQuizz a été modifié le <strong>${when()}</strong>. Par sécurité, toutes vos sessions ont été déconnectées.</p>`,
      note: `<strong>Ce n’est pas vous ?</strong> Choisissez tout de suite un nouveau mot de passe via <a href="${site}/mot-de-passe-oublie" style="color:#3445ff">Mot de passe oublié</a>, puis prévenez-nous en répondant à cet email.`,
    }),
  };
}

export function contactAckEmail(o: { name: string; subject: string; message: string }): Email {
  return {
    subject: "Nous avons bien reçu votre message — SQuizz",
    text: `Bonjour ${o.name},\n\nMerci pour votre message, nous vous répondons dès que possible.\n\nSujet : ${o.subject}\n\n${o.message}\n\nL’équipe SQuizz`,
    html: layout({
      preheader: "Merci, nous vous répondons dès que possible.",
      eyebrow: "Message reçu",
      title: "Merci pour votre message !",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0 0 16px">Nous avons bien reçu votre message et vous répondons dès que possible. Pour rappel :</p>
             <p style="margin:0 0 6px;font:700 12px 'Courier New',monospace;letter-spacing:1px">${esc(o.subject.toUpperCase())}</p>
             <div style="padding:16px;background:${C.cream};border:2px solid ${C.ink};border-radius:12px;white-space:pre-wrap">${esc(o.message)}</div>`,
      note: "Vous pouvez compléter votre demande en répondant directement à cet email.",
    }),
  };
}

export function accountDeletedEmail(o: { name: string; organization?: string }): Email {
  const what = o.organization
    ? `votre compte et l’organisation « ${o.organization} » (quiz, parties et médias) ont été supprimés`
    : "votre compte a été supprimé";
  return {
    subject: "Votre compte SQuizz a été supprimé",
    text: `Bonjour ${o.name},\n\nComme vous l’avez demandé, ${what} le ${when()}.\n\nMerci d’avoir joué avec SQuizz. Vous pouvez recréer un espace à tout moment.`,
    html: layout({
      preheader: "Votre demande de suppression a été traitée.",
      eyebrow: "Au revoir",
      title: "Compte supprimé",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Comme vous l’avez demandé, ${esc(what)} le <strong>${when()}</strong>. Merci d’avoir joué avec SQuizz !</p>`,
      cta: { label: "Recréer un espace", url: `${appUrl()}/inscription` },
      note: "Si vous n’êtes pas à l’origine de cette suppression, répondez immédiatement à cet email.",
    }),
  };
}

export function organizationUpdateEmail(o: {
  name: string;
  organization: string;
  plan?: "FREE" | "PRO";
  status?: "ACTIVE" | "SUSPENDED";
  limits?: { players: number; quizzes: number | null; members: number | null };
}): Email {
  const site = appUrl();
  if (o.status === "SUSPENDED")
    return {
      subject: `Votre espace ${o.organization} est suspendu`,
      text: `Bonjour ${o.name},\n\nL’espace « ${o.organization} » a été suspendu : ses membres ne peuvent plus se connecter. Pour en savoir plus, répondez à cet email.`,
      html: layout({
        preheader: "Votre espace SQuizz est suspendu.",
        eyebrow: "Organisation",
        title: "Espace suspendu",
        body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> a été suspendu : ses membres ne peuvent plus se connecter ni lancer de parties. Vos quiz sont conservés.</p>`,
        note: "Pour en savoir plus ou réactiver votre espace, répondez simplement à cet email.",
      }),
    };
  if (o.status === "ACTIVE" && !o.plan)
    return {
      subject: `Votre espace ${o.organization} est réactivé`,
      text: `Bonjour ${o.name},\n\nL’espace « ${o.organization} » est de nouveau actif : ${site}/connexion`,
      html: layout({
        preheader: "Votre espace SQuizz est de nouveau actif.",
        eyebrow: "Organisation",
        title: "Espace réactivé !",
        body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> est de nouveau actif. Vous et votre équipe pouvez vous reconnecter.</p>`,
        cta: { label: "Me connecter", url: `${site}/connexion` },
      }),
    };
  const pro = o.plan === "PRO";
  const l = o.limits!;
  const detail = `${l.quizzes === null ? "quiz illimités" : `${l.quizzes} quiz`}, ${l.players} joueurs par partie, ${l.members === null ? "membres illimités" : `${l.members} membres`}`;
  return {
    subject: pro
      ? `L’offre Pro est activée pour ${o.organization}`
      : `Votre espace ${o.organization} passe à l’offre Gratuit`,
    text: `Bonjour ${o.name},\n\nL’espace « ${o.organization} » est maintenant sur l’offre ${pro ? "Pro" : "Gratuit"} : ${detail}.\n\n${site}/app`,
    html: layout({
      preheader: `Votre espace est maintenant sur l’offre ${pro ? "Pro" : "Gratuit"}.`,
      eyebrow: "Votre offre",
      title: pro ? "Bienvenue en Pro !" : "Offre Gratuit",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> est maintenant sur l’offre <strong>${pro ? "Pro" : "Gratuit"}</strong> : ${detail}.</p>`,
      cta: { label: "Ouvrir mon espace", url: `${site}/app` },
    }),
  };
}
