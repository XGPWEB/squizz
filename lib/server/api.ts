import { z } from "zod";
import { HttpError } from "./http";

type Ctx<P> = { params: Promise<P> };

/** Wraps a route handler: JSON body parsing, known errors as JSON, unknown errors logged and hidden. */
export function route<P = Record<string, never>>(fn: (req: Request, params: P) => Promise<unknown>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const result = await fn(req, (await ctx?.params) as P);
      return result instanceof Response
        ? result
        : Response.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof z.ZodError)
        return Response.json({ error: e.issues[0]?.message ?? "Données invalides." }, { status: 400 });
      console.error(e);
      return Response.json(
        { error: "Une erreur empêche cette action. Réessaie dans un instant." },
        { status: 503 },
      );
    }
  };
}

export async function json<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  const body = await req.json().catch(() => {
    throw new HttpError("Requête invalide.");
  });
  return schema.parse(body);
}

export const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .max(200, "Mot de passe trop long.");
export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide.").max(200);
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Indique un nom.")
  .max(80, "Nom trop long (80 caractères maximum).");
