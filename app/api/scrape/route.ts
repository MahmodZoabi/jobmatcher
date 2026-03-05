import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

async function scrapeViaService(url: string): Promise<string> {
  const serviceUrl = process.env.SCRAPER_URL;
  const apiKey = process.env.SCRAPER_API_KEY ?? "";

  if (!serviceUrl) throw new Error("SCRAPER_URL not configured");

  if (isDev) console.log("[API /scrape] Calling scraper service for", url);

  const res = await fetch(`${serviceUrl}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(45_000),
  });

  const data = await res.json() as { text?: string; error?: string };

  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? `Scraper error ${res.status}`), {
      status: res.status,
    });
  }

  return data.text ?? "";
}

async function scrapeBasic(url: string): Promise<string> {
  if (isDev) console.log("[API /scrape] Falling back to basic fetch for", url);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Strip tags and collapse whitespace
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: 'Missing or invalid "url" in request body' },
        { status: 400 },
      );
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL must start with http:// or https://" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "That doesn't look like a valid URL. Please check and try again." },
        { status: 400 },
      );
    }

    let rawText = "";
    try {
      rawText = await scrapeViaService(url);
    } catch (serviceErr: any) {
      const isTimeout =
        serviceErr?.name === "AbortError" ||
        serviceErr?.message?.toLowerCase().includes("timeout") ||
        serviceErr?.message?.toLowerCase().includes("timed out");
      const isColdStart = isTimeout || serviceErr?.status === 503;

      if (isColdStart) {
        if (isDev) console.warn("[API /scrape] Scraper service cold start detected:", serviceErr?.message);
        return NextResponse.json(
          {
            error: "Our scraping service is waking up (this happens after inactivity). Please try again in 10-15 seconds — it'll be faster next time!",
            coldStart: true,
          },
          { status: 503 },
        );
      }

      if (isDev) console.warn("[API /scrape] Scraper service failed, falling back to basic fetch:", serviceErr?.message);
      try {
        rawText = await scrapeBasic(url);
      } catch (basicErr: any) {
        console.error("[API /scrape] Basic fetch also failed:", basicErr?.message);
        const basicIsTimeout =
          basicErr?.message?.toLowerCase().includes("timeout") ||
          basicErr?.message?.toLowerCase().includes("timed out");
        return NextResponse.json(
          {
            error: basicIsTimeout
              ? "Page took too long to load. Try pasting the job description directly instead."
              : "Couldn't load that page. Try pasting the job description directly instead.",
          },
          { status: 502 },
        );
      }
    }

    if (!rawText || rawText.length < 100) {
      return NextResponse.json(
        { error: "Couldn't find job content on that page. Try pasting the text directly." },
        { status: 422 },
      );
    }

    const truncated = rawText.slice(0, 12_000);

    const prompt = `The following is raw text extracted from a job listing page.
Clean it up and return only the structured job listing content: job title, company name, location, description, requirements, and any other relevant details.
Remove navigation menus, cookie banners, ads, and other boilerplate.
Return plain text only.

RAW TEXT:
${truncated}`;

    let text = truncated;
    try {
      text = await callGemini(prompt, { maxTokens: 2048 });
      if (isDev) console.log("[API /scrape] Gemini cleaned text to", text.length, "chars");
    } catch (geminiErr: any) {
      if (isDev) console.warn("[API /scrape] Gemini cleanup failed, using raw text:", geminiErr?.message);
    }

    return NextResponse.json({ text }, { status: 200 });
  } catch (error: any) {
    console.error("[API /scrape] Unexpected error:", error?.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
