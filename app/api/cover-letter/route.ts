import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cvText, job } = body as {
      cvText?: string;
      job?: Record<string, unknown>;
    };

    if (!cvText || !job) {
      return NextResponse.json(
        { error: 'Missing "cvText" or "job" in request body' },
        { status: 400 },
      );
    }

    const prompt = `You are a professional cover letter writer.
Write a tailored cover letter for the following candidate and job.

Candidate CV:
${cvText}

Job (structured data):
${JSON.stringify(job, null, 2)}

Rules:
- Be specific and targeted to the role.
- Use a professional but warm tone.
- Highlight the most relevant experience and skills.
- Write 3-4 solid paragraphs.

Return only the cover letter text.`.trim();

    const letter = await callGemini(prompt);
    if (isDev) console.log("[API /cover-letter] Generated letter length:", letter.length, "chars");

    if (!letter || letter.trim().length < 50) {
      return NextResponse.json(
        { error: "Failed to generate cover letter. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ letter: letter.trim() }, { status: 200 });
  } catch (error: any) {
    console.error("[API /cover-letter] Error:", error?.message);
    const isRateLimit = error?.message?.toLowerCase().includes("429") ||
      error?.message?.toLowerCase().includes("quota");
    return NextResponse.json(
      { error: isRateLimit ? "Rate limit reached. Please wait a moment and try again." : "Failed to generate cover letter. Please try again." },
      { status: isRateLimit ? 429 : 500 },
    );
  }
}
