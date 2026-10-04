/**
 * Legal information about the publisher, shared by the legal pages and contact links.
 * Publisher: Pressweb.
 */
export const COMPANY_INFO = {
  brand: "SQuizz",
  domain: "www.squizz.fun",
  siteUrl: "https://www.squizz.fun",
  editor: {
    name: "Pressweb",
    legalForm: "Entrepreneur individuel",
    siret: "753 126 531 00031",
    rcs: "Inscrit au Registre National des Entreprises (RNE) — SIREN 753 126 531",
    capital: "Sans capital social (entrepreneur individuel)",
    apeCode: "6201Z (Programmation informatique)",
    address: "77184 Émerainville, France",
    phone: "+33 6 60 77 47 06",
    email: "contact@pressweb.fr",
    director: "Xavier Gerinette",
    vatNumber: "Non assujetti à la TVA, art. 293 B du CGI (franchise en base)",
  },
  host: {
    name: "Hostinger International Ltd.",
    address: "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
    website: "https://www.hostinger.fr",
  },
  dpo: { name: "Xavier Gerinette", email: "contact@pressweb.fr" },
  lastUpdated: new Date("2026-10-04"),
} as const;

export const CONTACT_EMAIL = COMPANY_INFO.editor.email;
