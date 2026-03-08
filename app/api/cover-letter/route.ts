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

    const prompt = `You are an expert cover letter writer. Write a cover letter that makes the recruiter want to interview this candidate for this specific role.

YOUR GOAL: Every paragraph should answer the recruiter's question: 'why should we hire this person for THIS job?'

STRATEGY:
- Opening: State the role and company. Hook with the strongest connection between the candidate and the job — don't start with generic 'I am writing to express my interest.'
- Body paragraph 1: Connect the candidate's most relevant experience or projects to the job's core requirements. Use specific examples and mirror the job's language.
- Body paragraph 2: Address secondary requirements — education, technical skills, soft skills — and explain how they prepare the candidate for this specific role. Surface skills from their experience that aren't obvious but are relevant.
- Closing: Brief, confident, forward-looking. Express availability and enthusiasm.
- Sign off with 'Sincerely,' followed by the candidate's name on the next line.

CRITICAL CONSTRAINTS:
- Maximum 250 words. Tight and punchy.
- Mirror the job listing's language and keywords naturally — this helps with ATS.
- Never invent experience or skills. Only use what's in the CV.
- Don't be generic. Every sentence should be specific to THIS job at THIS company.
- Don't include the candidate's address or contact info — that's on the CV.
- Don't add a date — the PDF generator handles that.
- Output plain text only, no markdown.

Candidate CV:
${cvText}

Job (structured data):
${JSON.stringify(job, null, 2)}

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
