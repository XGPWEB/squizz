import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Messages } from "./messages";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const open = messages.filter((m) => !m.handled).length;
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">SUPER-ADMIN</p>
          <h1>Messages de contact</h1>
          <p className="hint">
            {open} à traiter · {messages.length} au total. Répondez depuis votre messagerie : le bouton ouvre
            un email adressé à l’expéditeur.
          </p>
        </div>
      </div>
      <Messages messages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))} />
    </>
  );
}
