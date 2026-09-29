import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Commencez gratuitement avec SQuizz, passez à l’offre Pro quand votre équipe grandit.",
};

const MB = 1024 * 1024;
const size = (bytes: number) => (bytes >= 1024 * MB ? `${bytes / (1024 * MB)} Go` : `${bytes / MB} Mo`);

export default function PricingPage() {
  const free = PLANS.FREE;
  const pro = PLANS.PRO;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">TARIFS</p>
        <h1>Simple comme un quiz.</h1>
        <p className="lead">Démarrez gratuitement. Passez à Pro quand vos parties prennent de l’ampleur.</p>
      </div>
      <div className="price-grid">
        <article className="price-card">
          <h2>{free.label}</h2>
          <p className="price">0 €</p>
          <p className="hint">Pour découvrir et animer de petits groupes.</p>
          <ul>
            <li>
              <Check size={18} /> {free.maxQuizzes} quiz enregistrés
            </li>
            <li>
              <Check size={18} /> Jusqu’à {free.maxPlayersPerGame} joueurs par partie
            </li>
            <li>
              <Check size={18} /> {free.maxMembers} membres dans l’équipe
            </li>
            <li>
              <Check size={18} /> {size(free.mediaBytes)} de médias
            </li>
            <li>
              <Check size={18} /> Tous les types de questions et de diapos
            </li>
          </ul>
          <Link className="button secondary" href="/inscription">
            Créer mon espace
          </Link>
        </article>
        <article className="price-card featured">
          <span className="sticker pink-sticker">LE PLUS COMPLET</span>
          <h2>{pro.label}</h2>
          <p className="price">Sur devis</p>
          <p className="hint">Pour les équipes, les écoles et les événements.</p>
          <ul>
            <li>
              <Check size={18} /> Quiz illimités
            </li>
            <li>
              <Check size={18} /> Jusqu’à {pro.maxPlayersPerGame} joueurs par partie
            </li>
            <li>
              <Check size={18} /> Animateurs illimités
            </li>
            <li>
              <Check size={18} /> {size(pro.mediaBytes)} de médias
            </li>
            <li>
              <Check size={18} /> Support prioritaire
            </li>
          </ul>
          <Link className="button" href="/#contact">
            Nous contacter
          </Link>
        </article>
      </div>
    </>
  );
}
