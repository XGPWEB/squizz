import "server-only";
import { COMPANY_INFO } from "@/lib/company-info";
import type { Plan } from "@prisma/client";
import { EVENT_PASS, PASS_OFFER, PLANS, isPaid, limitsSummary, offerOf, priceLabel } from "@/lib/plans";
import { alertLabel } from "@/lib/monitoring";
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

const DISPLAY = "Anton,Impact,'Arial Narrow Bold','Arial Black',sans-serif";
const TEXT = "Arial,Helvetica,sans-serif";
const MONO = "'Courier New',Courier,monospace";

/** Title in the site's style: condensed capitals, one word or name on a pink sticker. */
function heading(title: string, highlight?: string) {
  const sticker = (word: string) =>
    `<span style="display:inline-block;background:${C.pink};border:3px solid ${C.ink};border-radius:10px;padding:0 10px;box-shadow:4px 4px 0 ${C.ink}">${esc(word)}</span>`;
  const i = highlight ? title.indexOf(highlight) : -1;
  const html =
    i < 0
      ? esc(title)
      : esc(title.slice(0, i)) + sticker(highlight!) + esc(title.slice(i + highlight!.length));
  return `<h1 style="margin:0 0 22px;font:400 44px/1.25 ${DISPLAY};color:${C.ink};letter-spacing:0.3px">${html}</h1>`;
}

function layout(opts: {
  preheader: string;
  eyebrow: string;
  title: string;
  /** Part of the title shown on a pink sticker, like "défis." on the homepage. */
  highlight?: string;
  body: string;
  cta?: { label: string; url: string; intro?: string };
  note?: string;
}) {
  const site = appUrl();
  const button = opts.cta
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0"><tr><td style="background:${C.acid};border:3px solid ${C.ink};border-radius:22px;box-shadow:8px 8px 0 ${C.ink};padding:24px 24px 22px">
        ${opts.cta.intro ? `<p style="margin:0 0 14px;font:400 26px/1.2 ${DISPLAY};color:${C.ink}">${esc(opts.cta.intro)}</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${C.ink};border-radius:12px;box-shadow:0 5px 0 ${C.electric}">
          <a href="${esc(opts.cta.url)}" style="display:block;padding:16px 20px;font:700 17px ${TEXT};color:${C.acid};text-decoration:none">${esc(opts.cta.label)} &rarr;</a>
        </td></tr></table>
        <p style="margin:14px 0 0;font:12px/1.5 ${TEXT};color:${C.ink};text-align:center">Le bouton ne marche pas ? Copiez ce lien :<br><a href="${esc(opts.cta.url)}" style="color:${C.ink};word-break:break-all">${esc(opts.cta.url)}</a></p>
      </td></tr></table>`
    : "";
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
<title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:20px 12px 32px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
    <tr><td><a href="${site}"><img src="${site}/email/entete.png" width="600" alt="SQuizz — Le savoir, ça se joue." style="display:block;width:100%;max-width:600px;height:auto;border:0"></a></td></tr>
    <tr><td style="padding:26px 20px 8px">
      <p style="margin:0 0 16px"><span style="display:inline-block;background:${C.ink};color:${C.acid};padding:7px 12px;border-radius:7px;font:700 13px/1.3 ${MONO};letter-spacing:2px">${esc(opts.eyebrow.toUpperCase())}</span></p>
      ${heading(opts.title, opts.highlight)}
      <div style="font:17px/1.65 ${TEXT};color:${C.ink}">${opts.body}</div>
      ${button}
      ${opts.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0"><tr><td style="background:#ffffff;border:3px solid ${C.ink};border-radius:16px;box-shadow:6px 6px 0 ${C.pink};padding:16px 18px;font:14px/1.55 ${TEXT};color:${C.ink}">${opts.note}</td></tr></table>` : ""}
    </td></tr>
    <tr><td style="padding:34px 20px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${C.ink};border-radius:18px;padding:22px 22px 20px">
        <p style="margin:0 0 10px;font:400 22px/1.25 ${DISPLAY};color:${C.acid};letter-spacing:0.5px">ON JOUE ENSEMBLE. <span style="color:${C.pink}">ON BRILLE CHACUN SON TOUR.</span></p>
        <p style="margin:0;font:12px/1.8 ${MONO};color:${C.cream}">
          <a href="${site}" style="color:${C.cream}">${site.replace(/^https?:\/\//, "")}</a> &nbsp;·&nbsp; <a href="mailto:${COMPANY_INFO.editor.email}" style="color:${C.cream}">${COMPANY_INFO.editor.email}</a> &nbsp;·&nbsp; <a href="${site}/confidentialite" style="color:${C.cream}">Confidentialité</a><br>
          <span style="color:#bdb8ad">Service conçu par ${esc(COMPANY_INFO.editor.name)}, en France.</span>
        </p>
      </td></tr></table>
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
      highlight: "l’équipe",
      body: `<p style="margin:0 0 12px"><strong>${esc(o.inviter)}</strong> vous invite à rejoindre <strong>${esc(o.organization)}</strong> sur SQuizz en tant qu’<strong>${roleName(o.role)}</strong>.</p>
             <p style="margin:0">Créez vos quiz, lancez des parties en direct et faites jouer votre public depuis son téléphone.</p>`,
      cta: { label: "Créer mon compte", url: o.link, intro: "Prêt à jouer ?" },
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
      title: "Un nouveau mot de passe ?",
      highlight: "mot de passe",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Vous avez demandé à changer le mot de passe de votre compte SQuizz. Cliquez sur le bouton pour en choisir un nouveau.</p>`,
      cta: { label: "Choisir mon mot de passe", url: o.link, intro: "Un clic et c’est réglé." },
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
      cta: { label: "Voir dans le super-admin", url: `${site}/super-admin/messages` },
      note: "Répondez directement à cet email : la réponse part vers l’expéditeur.",
    }),
  };
}

/** Numbered steps drawn like the game's answer tiles. */
function steps(items: string[]) {
  const colors = [C.electric, C.acid, C.pink, C.orange];
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 0">${items
    .map((item, i) => {
      const light = i % 4 === 0;
      return `<tr><td style="padding:0 0 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${colors[i % 4]};border:3px solid ${C.ink};border-radius:14px;box-shadow:4px 4px 0 ${C.ink};padding:14px 16px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:top;padding:0 14px 0 0"><span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background:#ffffff;border:2px solid ${C.ink};border-radius:8px;font:700 15px ${MONO};color:${C.ink}">${String.fromCharCode(65 + i)}</span></td>
          <td style="font:15px/1.5 ${TEXT};color:${light ? "#ffffff" : C.ink}">${item}</td>
        </tr></table>
      </td></tr></table></td></tr>`;
    })
    .join("")}</table>`;
}

const when = () =>
  new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });

export function welcomeEmail(o: { name: string; organization: string }): Email {
  const site = appUrl();
  return {
    subject: `Bienvenue sur SQuizz, ${o.name} !`,
    text: `Bonjour ${o.name},\n\nVotre espace « ${o.organization} » est prêt sur SQuizz.\n\n1. Créez votre premier quiz (14 types de questions, images, vidéos).\n2. Lancez une partie : un code et un QR code s’affichent à l’écran.\n3. Vos participants jouent depuis leur téléphone, sans application.\n\nCommencer : ${site}/app\n\nUne question ? Répondez simplement à cet email.`,
    html: layout({
      preheader: `Votre espace ${o.organization} est prêt : créez votre premier quiz.`,
      eyebrow: "Bienvenue",
      title: `Bienvenue, ${o.name} !`,
      highlight: o.name,
      body: `<p style="margin:0">Votre espace <strong>${esc(o.organization)}</strong> est prêt. Trois étapes et c’est parti :</p>
             ${steps([
               "<strong>Créez votre premier quiz</strong> : 14 types de questions, images, vidéos et diapos.",
               "<strong>Lancez une partie</strong> : un code et un QR code s’affichent sur votre écran.",
               "<strong>Faites jouer la salle</strong> : chacun répond depuis son téléphone, sans application.",
             ])}`,
      cta: { label: "Créer mon premier quiz", url: `${site}/app`, intro: "À vous de jouer !" },
      note: `Vous êtes sur l’offre <strong>Gratuit</strong> : ${limitsSummary(PLANS.FREE)}. Pour aller plus loin, voyez nos offres sans engagement sur ${appUrl()}/tarifs. Une question ? Répondez simplement à cet email.`,
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
      highlight: "l’équipe",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Votre compte <strong>${roleName(o.role)}</strong> de <strong>${esc(o.organization)}</strong> est prêt. Retrouvez les quiz de l’équipe, créez les vôtres et lancez vos parties.</p>`,
      cta: { label: "Ouvrir mon espace", url: `${site}/app`, intro: "Premier quiz en vue ?" },
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
      title: `${o.member} a rejoint l’équipe !`,
      highlight: o.member,
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
      title: "Mot de passe modifié.",
      highlight: "modifié.",
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
      title: "Message bien reçu !",
      highlight: "reçu",
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
      title: "À bientôt, peut-être !",
      highlight: "peut-être",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Comme vous l’avez demandé, ${esc(what)} le <strong>${when()}</strong>. Merci d’avoir joué avec SQuizz !</p>`,
      cta: { label: "Recréer un espace", url: `${appUrl()}/inscription` },
      note: "Si vous n’êtes pas à l’origine de cette suppression, répondez immédiatement à cet email.",
    }),
  };
}

export function organizationUpdateEmail(o: {
  name: string;
  organization: string;
  plan?: Plan;
  status?: "ACTIVE" | "SUSPENDED";
}): Email {
  const site = appUrl();
  if (o.status === "SUSPENDED")
    return {
      subject: `Votre espace ${o.organization} est suspendu`,
      text: `Bonjour ${o.name},\n\nL’espace « ${o.organization} » a été suspendu : ses membres ne peuvent plus se connecter. Pour en savoir plus, répondez à cet email.`,
      html: layout({
        preheader: "Votre espace SQuizz est suspendu.",
        eyebrow: "Organisation",
        title: "Espace suspendu.",
        highlight: "suspendu.",
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
        title: "C’est reparti !",
        highlight: "reparti",
        body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> est de nouveau actif. Vous et votre équipe pouvez vous reconnecter.</p>`,
        cta: { label: "Me connecter", url: `${site}/connexion` },
      }),
    };
  const paid = isPaid(o.plan!);
  const p = PLANS[o.plan!];
  const detail = limitsSummary(p);
  const offer = paid ? `${p.label} (${priceLabel(p)}, sans engagement)` : p.label;
  return {
    subject: paid
      ? `L’offre ${p.label} est activée pour ${o.organization}`
      : `Votre espace ${o.organization} passe à l’offre Gratuit`,
    text: `Bonjour ${o.name},\n\nL’espace « ${o.organization} » est maintenant sur l’offre ${offer} : ${detail}.\n\n${site}/app`,
    html: layout({
      preheader: `Votre espace est maintenant sur l’offre ${p.label}.`,
      eyebrow: "Votre offre",
      title: paid ? `Bienvenue en ${p.label} !` : "Offre Gratuit.",
      highlight: paid ? p.label : "Gratuit.",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> est maintenant sur l’offre <strong>${esc(offer)}</strong> : ${detail}.</p>`,
      cta: { label: "Ouvrir mon espace", url: `${site}/app` },
    }),
  };
}

/** Confirmation sent to the administrator who stops a paid plan. */
export function subscriptionCancelEmail(o: { name: string; organization: string; plan: Plan }): Email {
  const p = PLANS[o.plan];
  const until =
    p.period === "an"
      ? "L’abonnement ne sera pas renouvelé : il reste actif jusqu’à la fin de l’année déjà payée."
      : "L’offre reste active jusqu’à la fin du mois en cours, sans nouveau paiement.";
  const site = appUrl();
  return {
    subject: `Arrêt de votre abonnement ${p.label} — ${o.organization}`,
    text: `Bonjour ${o.name},\n\nNous avons bien enregistré l’arrêt de l’abonnement ${p.label} de « ${o.organization} » le ${when()}. ${until} Votre espace passera ensuite sur l’offre Gratuit : vos quiz sont conservés.\n\nVous avez changé d’avis ? ${site}/app/equipe`,
    html: layout({
      preheader: `L’arrêt de votre abonnement ${p.label} est enregistré.`,
      eyebrow: "Votre abonnement",
      title: "Arrêt enregistré.",
      highlight: "enregistré.",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0 0 12px">Nous avons bien enregistré l’arrêt de l’abonnement <strong>${esc(p.label)}</strong> de <strong>${esc(o.organization)}</strong> le ${when()}.</p><p style="margin:0">${until} Votre espace passera ensuite sur l’offre Gratuit : vos quiz sont conservés.</p>`,
      cta: {
        label: "Reprendre mon abonnement",
        url: `${site}/app/equipe`,
        intro: "Vous avez changé d’avis ?",
      },
    }),
  };
}

/** Tells Pressweb that an organisation stopped (or resumed) its paid plan. */
export function subscriptionCancelNoticeEmail(o: {
  organization: string;
  organizationId: string;
  plan: Plan;
  by: string;
  resumed?: boolean;
  /** Stripe subscription: Stripe stops the renewal and the plan changes by itself. */
  automatic?: boolean;
}): Email {
  const p = PLANS[o.plan];
  const what = o.resumed ? "reprend son abonnement" : "arrête son abonnement";
  const todo = o.resumed
    ? "Rien à faire : l’offre continue."
    : o.automatic
      ? "Rien à faire : Stripe arrête le renouvellement et l’organisation repassera seule sur l’offre Gratuit à la fin de la période payée."
      : "À faire : repasser l’organisation sur l’offre Gratuit à la fin de la période payée et arrêter la facturation.";
  const site = appUrl();
  return {
    subject: `[SQuizz] ${o.organization} ${what} ${p.label}`,
    text: `${o.organization} ${what} ${p.label} (${priceLabel(p)}), demande de ${o.by} le ${when()}.\n\n${todo}\n\n${site}/super-admin/organisations/${o.organizationId}`,
    html: layout({
      preheader: `${o.organization} ${what} ${p.label}.`,
      eyebrow: "Abonnement",
      title: o.resumed ? "Abonnement repris." : "Arrêt d’abonnement.",
      body: `<p style="margin:0 0 12px"><strong>${esc(o.organization)}</strong> ${what} <strong>${esc(p.label)}</strong> (${esc(priceLabel(p))}), demande de ${esc(o.by)} le ${when()}.</p><p style="margin:0">${todo}</p>`,
      cta: { label: "Voir l’organisation", url: `${site}/super-admin/organisations/${o.organizationId}` },
    }),
  };
}

/** Tells Pressweb that someone just created an organisation; the address is not confirmed yet. */
export function newSignupNoticeEmail(o: {
  name: string;
  email: string;
  organization: string;
  organizationId: string;
  /** The offer chosen on the pricing page, if any. */
  offer: ReturnType<typeof offerOf>;
}): Email {
  const offer = o.offer ? (o.offer === PASS_OFFER ? EVENT_PASS.label : PLANS[o.offer].label) : null;
  const details = `${o.name} (${o.email}) vient de créer l’espace « ${o.organization} » le ${when()}`;
  const chosen = offer ? ` Offre choisie : ${offer}.` : "";
  const todo = "Le compte s’ouvrira quand l’adresse sera confirmée.";
  const site = appUrl();
  return {
    subject: `[SQuizz] Nouvelle inscription : ${o.organization}`,
    text: `${details}.${chosen}\n\n${todo}\n\n${site}/super-admin/organisations/${o.organizationId}`,
    html: layout({
      preheader: `${o.name} vient de créer l’espace ${o.organization}.`,
      eyebrow: "Inscription",
      title: "Nouvelle inscription.",
      body: `<p style="margin:0 0 12px">${esc(details)}.${esc(chosen)}</p><p style="margin:0">${todo}</p>`,
      cta: { label: "Voir l’organisation", url: `${site}/super-admin/organisations/${o.organizationId}` },
    }),
  };
}

/** Partner status granted (Premium for free) or withdrawn by the super-admin. */
export function partnerEmail(o: { name: string; organization: string; partner: boolean; plan: Plan }): Email {
  const site = appUrl();
  const premium = PLANS.PREMIUM;
  if (o.partner)
    return {
      subject: `${o.organization} devient partenaire SQuizz`,
      text: `Bonjour ${o.name},\n\n« ${o.organization} » est maintenant partenaire SQuizz : l’offre ${premium.label} vous est offerte (${limitsSummary(premium)}), sans rien à payer.\n\n${site}/app`,
      html: layout({
        preheader: `L’offre ${premium.label} vous est offerte.`,
        eyebrow: "Partenariat",
        title: "Bienvenue parmi nos partenaires !",
        highlight: "partenaires",
        body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">L’espace <strong>${esc(o.organization)}</strong> est maintenant <strong>partenaire SQuizz</strong> : l’offre <strong>${esc(premium.label)}</strong> vous est offerte, sans rien à payer : ${limitsSummary(premium)}.</p>`,
        cta: { label: "Ouvrir mon espace", url: `${site}/app` },
      }),
    };
  const back = PLANS[o.plan];
  return {
    subject: `Fin du partenariat SQuizz pour ${o.organization}`,
    text: `Bonjour ${o.name},\n\nLe partenariat de « ${o.organization} » avec SQuizz a pris fin. Votre espace revient sur l’offre ${back.label} : ${limitsSummary(back)}. Vos quiz sont conservés.\n\n${site}/tarifs`,
    html: layout({
      preheader: `Votre espace revient sur l’offre ${back.label}.`,
      eyebrow: "Partenariat",
      title: "Fin du partenariat.",
      highlight: "partenariat.",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Le partenariat de <strong>${esc(o.organization)}</strong> avec SQuizz a pris fin. Votre espace revient sur l’offre <strong>${esc(back.label)}</strong> : ${limitsSummary(back)}. Vos quiz sont conservés.</p>`,
      cta: { label: "Voir les offres", url: `${site}/tarifs` },
      note: "Une question sur ce changement ? Répondez simplement à cet email.",
    }),
  };
}

/** Sent right after signup: the account opens once the address is confirmed. */
export function verifyEmail(o: { name: string; link: string; hours: number }): Email {
  return {
    subject: "Confirmez votre adresse e-mail — SQuizz",
    text: `Bonjour ${o.name},\n\nPour activer votre espace SQuizz, confirmez votre adresse e-mail en ouvrant ce lien (valable ${o.hours} heures) :\n${o.link}\n\nSi vous n’avez pas créé de compte SQuizz, ignorez cet email.`,
    html: layout({
      preheader: "Un clic pour activer votre espace SQuizz.",
      eyebrow: "Inscription",
      title: "Confirmez votre adresse.",
      highlight: "adresse.",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0">Merci pour votre inscription ! Pour activer votre espace SQuizz, confirmez que cette adresse e-mail est bien la vôtre.</p>`,
      cta: { label: "Confirmer mon adresse", url: o.link, intro: "Un clic et c’est parti." },
      note: `Ce lien est valable ${o.hours} heures et ne sert qu’une fois. Si vous n’avez pas créé de compte SQuizz, ignorez cet email : aucun compte ne sera activé.`,
    }),
  };
}

/** Confirms a paid event pass to the organisation's administrators. */
export function eventPassEmail(o: { name: string; organization: string; until: Date }): Email {
  const site = appUrl();
  const until = o.until.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  });
  const detail = limitsSummary(PLANS[EVENT_PASS.plan]);
  return {
    subject: `Votre ${EVENT_PASS.label} est activé pour ${o.organization}`,
    text: `Bonjour ${o.name},\n\nLe ${EVENT_PASS.label} est activé pour l’espace « ${o.organization} » jusqu’au ${until} : ${detail}.\n\nPaiement unique, sans abonnement : rien ne sera renouvelé. Après cette date, votre espace retrouve son offre habituelle et vos quiz sont conservés.\n\n${site}/app`,
    html: layout({
      preheader: `${EVENT_PASS.label} activé jusqu’au ${until}.`,
      eyebrow: "Votre offre",
      title: "Votre pack est prêt !",
      highlight: "prêt",
      body: `<p style="margin:0 0 12px">Bonjour ${esc(o.name)},</p><p style="margin:0 0 12px">Le <strong>${EVENT_PASS.label}</strong> est activé pour l’espace <strong>${esc(o.organization)}</strong> jusqu’au <strong>${until}</strong> : ${detail}.</p><p style="margin:0">Paiement unique, sans abonnement : rien ne sera renouvelé. Après cette date, votre espace retrouve son offre habituelle et vos quiz sont conservés.</p>`,
      cta: { label: "Préparer mon événement", url: `${site}/app` },
    }),
  };
}

/** Tells Pressweb that something failed silently; the details are on the super-admin's monitoring page. */
export function systemAlertEmail(o: { type: string; message: string; path?: string }): Email {
  const site = appUrl();
  const label = alertLabel(o.type);
  return {
    subject: `[SQuizz] ${label}`,
    text: `${label}\n\n${o.message}${o.path ? `\n${o.path}` : ""}\n\nDétail et historique : ${site}/super-admin/monitoring\n\nUne alerte du même type ne sera pas renvoyée par e-mail avant 30 minutes.`,
    html: layout({
      preheader: `${label} : ${o.message}`,
      eyebrow: "Monitoring",
      title: `${label}.`,
      body: `<p style="margin:0 0 12px"><strong>${esc(o.message)}</strong></p>${o.path ? `<p style="margin:0 0 12px;font-family:monospace">${esc(o.path)}</p>` : ""}<p style="margin:0">Une alerte du même type ne sera pas renvoyée par e-mail avant 30 minutes.</p>`,
      cta: { label: "Ouvrir le monitoring", url: `${site}/super-admin/monitoring` },
    }),
  };
}

/** Tells Pressweb that SQuizz cancelled a subscription by itself, to check whether a refund is due. */
export function billingAlertEmail(o: { subscriptionId: string; reason: string }): Email {
  return {
    subject: `[SQuizz] Abonnement Stripe annulé automatiquement`,
    text: `SQuizz a annulé l’abonnement Stripe ${o.subscriptionId} : ${o.reason}.\n\nÀ vérifier dans Stripe : un paiement a peut-être été encaissé pour cet abonnement et doit être remboursé.`,
    html: layout({
      preheader: `Abonnement ${o.subscriptionId} annulé : ${o.reason}.`,
      eyebrow: "Facturation",
      title: "Abonnement annulé.",
      body: `<p style="margin:0 0 12px">SQuizz a annulé l’abonnement Stripe <strong>${esc(o.subscriptionId)}</strong> : ${esc(o.reason)}.</p><p style="margin:0">À vérifier dans Stripe : un paiement a peut-être été encaissé pour cet abonnement et doit être remboursé.</p>`,
    }),
  };
}
