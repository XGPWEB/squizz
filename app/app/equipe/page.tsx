import type { Metadata } from "next";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Équipe" };

export default function TeamPage() {
  return <TeamManager />;
}
