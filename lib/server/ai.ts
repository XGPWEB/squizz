import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import {
  AI_COUNTS,
  AI_INSTRUCTIONS,
  AI_LEVELS,
  AI_MAX_PDF,
  AI_MAX_TEXT,
  AI_SCHEMA,
  AI_TYPES,
  aiRequest,
  aiToQuestions,
  type AiAnswer,
  type AiType,
} from "@/lib/ai-quiz";
import { fail, type Body } from "./http";
import { open, seal, secretsReady } from "./secret-box";
import { rateLimit } from "./rate-limit";

export const AI_PROVIDERS = ["anthropic", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
/** Models used when the organisation does not name one. */
export const DEFAULT_MODELS: Record<AiProvider, string> = { anthropic: "claude-opus-5-5", openai: "gpt-5" };
/** Generations per organisation per day: the cost is the organisation's, but a loop stays bounded. */
const PER_DAY = 40;

type Org = {
  id: string;
  aiProvider: string | null;
  aiKey: string | null;
  aiKeyHint: string | null;
  aiModel: string | null;
};

/** What the settings show: never the key itself. */
export const aiSettings = (org: Org) => ({
  ready: secretsReady(),
  provider: (org.aiProvider as AiProvider | null) ?? null,
  hint: org.aiKeyHint,
  model: org.aiModel,
  defaults: DEFAULT_MODELS,
});

/** An administrator connects the organisation's AI account (the key is encrypted at once). */
export async function saveAiSettings(organizationId: string, body: Body) {
  if (!secretsReady()) fail("La génération par IA n’est pas encore activée sur ce serveur.", 503);
  const provider = body.provider as AiProvider;
  if (!AI_PROVIDERS.includes(provider)) fail("Choisissez Claude ou ChatGPT.");
  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (model && !/^[\w.:-]{2,80}$/.test(model)) fail("Nom de modèle invalide.");
  const key = typeof body.key === "string" ? body.key.trim() : "";
  const current = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  if (!key && (!current.aiKey || current.aiProvider !== provider)) fail("Collez la clé de votre compte.");
  if (key && (key.length < 20 || key.length > 300 || /\s/.test(key))) fail("Cette clé ne semble pas valide.");
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiProvider: provider,
      aiModel: model || null,
      ...(key ? { aiKey: seal(key), aiKeyHint: key.slice(-4) } : {}),
    },
  });
}

export const removeAiSettings = (organizationId: string) =>
  prisma.organization.update({
    where: { id: organizationId },
    data: { aiProvider: null, aiKey: null, aiKeyHint: null, aiModel: null },
  });

type Input = {
  text: string;
  pdf: string | null;
  count: number;
  types: AiType[];
  level: string;
  topic: string;
};

function parseInput(body: Body): Input {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const pdf = typeof body.pdf === "string" && body.pdf ? body.pdf : null;
  if (!text && !pdf) fail("Collez un texte ou ajoutez un document PDF.");
  if (text.length > AI_MAX_TEXT)
    fail(`Texte trop long : ${AI_MAX_TEXT.toLocaleString("fr-FR")} caractères au plus.`);
  if (pdf && (!/^[A-Za-z0-9+/=]+$/.test(pdf) || (pdf.length * 3) / 4 > AI_MAX_PDF))
    fail("Document PDF trop lourd : 10 Mo au plus.");
  const count = Number(body.count);
  if (!AI_COUNTS.includes(count as (typeof AI_COUNTS)[number])) fail("Nombre de questions invalide.");
  const types = (Array.isArray(body.types) ? body.types : []).filter((t: unknown): t is AiType =>
    AI_TYPES.some((x) => x[0] === t),
  );
  if (!types.length) fail("Choisissez au moins un type de question.");
  const level = AI_LEVELS.some((l) => l[0] === body.level) ? String(body.level) : "medium";
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 500) : "";
  return { text, pdf, count, types, level, topic };
}

async function askClaude(key: string, model: string, input: Input): Promise<AiAnswer> {
  const client = new Anthropic({ apiKey: key, maxRetries: 1, timeout: 170_000 });
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.pdf)
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.pdf },
    });
  content.push({
    type: "text",
    text: `${input.text ? `Contenu source :\n<source>\n${input.text}\n</source>\n\n` : ""}${aiRequest(input)}`,
  });
  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      // On a policy decline, the request is retried on another model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: AI_INSTRUCTIONS,
      output_config: { effort: "medium", format: { type: "json_schema", schema: AI_SCHEMA } },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") fail("L’IA a refusé de traiter ce contenu.", 422);
    if (response.stop_reason === "max_tokens")
      fail("Réponse trop longue : demandez moins de questions.", 422);
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return JSON.parse(text) as AiAnswer;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      fail("Claude refuse la clé de votre organisation : un administrateur doit la vérifier.", 422);
    if (e instanceof Anthropic.RateLimitError)
      fail("Votre compte Claude a atteint sa limite. Réessayez dans quelques minutes.", 429);
    if (e instanceof Anthropic.NotFoundError)
      fail("Modèle Claude introuvable : vérifiez le nom du modèle.", 422);
    if (e instanceof Anthropic.BadRequestError)
      fail("Claude n’a pas pu traiter ce contenu (document trop long ou illisible ?).", 422);
    if (e instanceof Anthropic.APIConnectionError)
      fail("Claude ne répond pas. Réessayez dans un instant.", 503);
    if (e instanceof SyntaxError) fail("La réponse de l’IA était incomplète. Réessayez.", 502);
    throw e;
  }
}

async function askOpenAI(key: string, model: string, input: Input): Promise<AiAnswer> {
  if (input.pdf) fail("Avec ChatGPT, collez le texte du document : les PDF passent par Claude seulement.");
  const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(170_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: AI_INSTRUCTIONS },
        {
          role: "user",
          content: `Contenu source :\n<source>\n${input.text}\n</source>\n\n${aiRequest(input)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "quiz", strict: true, schema: AI_SCHEMA },
      },
    }),
  }).catch(() => fail("ChatGPT ne répond pas. Réessayez dans un instant.", 503));
  const data = await res.json().catch(() => null);
  if (res.status === 401 || res.status === 403)
    fail("ChatGPT refuse la clé de votre organisation : un administrateur doit la vérifier.", 422);
  if (res.status === 429) fail("Votre compte ChatGPT a atteint sa limite ou n’a plus de crédit.", 429);
  if (res.status === 404) fail("Modèle ChatGPT introuvable : vérifiez le nom du modèle.", 422);
  if (!res.ok) fail("ChatGPT n’a pas pu traiter ce contenu.", 422);
  const message = data?.choices?.[0]?.message;
  if (message?.refusal) fail("L’IA a refusé de traiter ce contenu.", 422);
  try {
    return JSON.parse(String(message?.content ?? "")) as AiAnswer;
  } catch {
    fail("La réponse de l’IA était incomplète. Réessayez.", 502);
  }
}

/** Writes a draft quiz from the member's content with the organisation's own AI account. */
export async function generateQuiz(org: Org, body: Body) {
  if (!secretsReady()) fail("La génération par IA n’est pas encore activée sur ce serveur.", 503);
  if (!org.aiProvider || !org.aiKey) fail("Votre organisation n’a pas encore connecté de compte IA.", 409);
  const input = parseInput(body);
  if (!(await rateLimit(`ai:${org.id}`, PER_DAY, 24 * 60 * 60)).allowed)
    fail(`Limite de ${PER_DAY} générations par jour atteinte pour votre organisation.`, 429);
  const provider = org.aiProvider as AiProvider;
  const model = org.aiModel || DEFAULT_MODELS[provider];
  const key = open(org.aiKey);
  const answer =
    provider === "anthropic" ? await askClaude(key, model, input) : await askOpenAI(key, model, input);
  const result = aiToQuestions(answer, input.types);
  if (!result.questions.length)
    fail("L’IA n’a proposé aucune question utilisable. Essayez avec un autre contenu.", 422);
  return result;
}
