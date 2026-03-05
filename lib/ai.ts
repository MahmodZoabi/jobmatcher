import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

type GeminiOptions = {
  maxTokens?: number;
};

type ClaudeOptions = {
  maxTokens?: number;
};

const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const isDev = process.env.NODE_ENV === "development";

function isRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("too many requests") || msg.includes("resource_exhausted");
}

function isOverloadError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("503") || msg.includes("service unavailable") || msg.includes("high demand") || msg.includes("overloaded");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiModel(
  model: ReturnType<InstanceType<typeof GoogleGenerativeAI>["getGenerativeModel"]>,
  request: Parameters<typeof model.generateContent>[0],
): Promise<string> {
  const result = await model.generateContent(request);
  return result.response.text();
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[AI] GEMINI_API_KEY is not set in environment");
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[AI] ANTHROPIC_API_KEY is not set in environment");
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

export async function callGemini(
  prompt: string,
  options: GeminiOptions = {},
): Promise<string> {
  const client = getGeminiClient();
  let lastError: unknown;

  const request = {
    contents: [{ role: "user" as const, parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: options.maxTokens ?? 8000 },
  };

  for (const modelName of GEMINI_MODELS) {
    const model = client.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        if (isDev) console.log(`[AI] Trying Gemini model: ${modelName} (attempt ${attempt + 1})`);
        const text = await callGeminiModel(model, request);
        if (isDev) console.log(`[AI] Success: ${modelName} | ${text.length} chars`);
        return text;
      } catch (err: unknown) {
        if (isRateLimitError(err)) {
          // 429 — no point retrying same model
          const next = GEMINI_MODELS[GEMINI_MODELS.indexOf(modelName) + 1];
          console.warn(`[AI] ${modelName} quota exceeded, trying ${next ?? "nothing"}`);
          lastError = err;
          break; // break inner loop, continue to next model
        }
        if (isOverloadError(err) && attempt === 0) {
          // 503 on first attempt — wait 2s and retry same model once
          console.warn(`[AI] ${modelName} overloaded (503), retrying in 2s…`);
          await sleep(2000);
          lastError = err;
          continue; // retry same model
        }
        // 503 on second attempt, or any other error — move to next model
        const next = GEMINI_MODELS[GEMINI_MODELS.indexOf(modelName) + 1];
        if (isOverloadError(err)) {
          console.warn(`[AI] ${modelName} still overloaded after retry, trying ${next ?? "nothing"}`);
          lastError = err;
          break;
        }
        throw err; // unexpected error — propagate immediately
      }
    }
  }

  // All models exhausted — attach a flag so callers can show a specific message
  const allBusyError = new Error("AI servers are busy. Please try again in a few seconds.");
  (allBusyError as any).allModelsFailed = true;
  throw allBusyError;
}

export async function callGeminiWithImage(
  base64: string,
  mimeType: string,
  prompt: string,
  options: GeminiOptions = {},
): Promise<string> {
  const client = getGeminiClient();
  let lastError: unknown;

  const request = {
    contents: [
      {
        role: "user" as const,
        parts: [
          { inlineData: { data: base64, mimeType } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: options.maxTokens ?? 8000 },
  };

  for (const modelName of GEMINI_MODELS) {
    const model = client.getGenerativeModel({ model: modelName });

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        if (isDev) console.log(`[AI] Trying Gemini model (image): ${modelName} (attempt ${attempt + 1})`);
        const text = await callGeminiModel(model, request);
        if (isDev) console.log(`[AI] Success (image): ${modelName} | ${text.length} chars`);
        return text;
      } catch (err: unknown) {
        if (isRateLimitError(err)) {
          const next = GEMINI_MODELS[GEMINI_MODELS.indexOf(modelName) + 1];
          console.warn(`[AI] ${modelName} quota exceeded, trying ${next ?? "nothing"}`);
          lastError = err;
          break;
        }
        if (isOverloadError(err) && attempt === 0) {
          console.warn(`[AI] ${modelName} overloaded (503), retrying in 2s…`);
          await sleep(2000);
          lastError = err;
          continue;
        }
        const next = GEMINI_MODELS[GEMINI_MODELS.indexOf(modelName) + 1];
        if (isOverloadError(err)) {
          console.warn(`[AI] ${modelName} still overloaded after retry, trying ${next ?? "nothing"}`);
          lastError = err;
          break;
        }
        throw err;
      }
    }
  }

  const allBusyError = new Error("AI servers are busy. Please try again in a few seconds.");
  (allBusyError as any).allModelsFailed = true;
  throw allBusyError;
}

export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {},
): Promise<string> {
  if (isDev) console.log("[AI] Using Claude model:", CLAUDE_MODEL);
  const client = getClaudeClient();

  const maxTokens = options.maxTokens ?? 1000;

  const msg = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });

  const textParts =
    msg.content
      ?.map((part) => ("text" in part ? part.text : ""))
      .join(" ")
      .trim() ?? "";

  return textParts;
}
