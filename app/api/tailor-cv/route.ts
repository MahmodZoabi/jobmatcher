import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/ai";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cvText,
      jobText,
      job,
    }: {
      cvText?: string;
      jobText?: string;
      job?: {
        matchingSkills?: string[] | string;
        missingSkills?: string[] | string;
        gaps?: string[] | string;
        tips?: string[] | string;
        [key: string]: unknown;
      };
    } = body;

    if (!cvText || !jobText || !job) {
      return NextResponse.json(
        { error: 'Missing "cvText", "jobText", or "job" in request body' },
        { status: 400 },
      );
    }

    const matchingSkills = job.matchingSkills ?? [];
    const missingSkills = job.missingSkills ?? [];
    const gaps = job.gaps ?? [];

    const rewritePrompt = `You are a professional CV editor. Rewrite this CV to be optimized for the specific job listing below.

Rules:
- Keep ALL real information — never invent experience, skills, or achievements the candidate doesn't have
- Reorder sections to put the most relevant experience first
- Rewrite bullet points to use keywords from the job listing where honestly applicable
- Emphasize matching skills and relevant achievements
- Add a tailored professional summary at the top (2-3 sentences targeting this role)
- If the candidate has transferable skills that relate to a requirement, highlight that connection
- Keep the same overall structure (sections, dates, companies) but optimize the wording
- Format cleanly with clear sections

CANDIDATE CV:
${cvText}

JOB LISTING:
${jobText}

ANALYSIS (what matches and what's missing):
Matching skills: ${JSON.stringify(matchingSkills)}
Missing skills: ${JSON.stringify(missingSkills)}
Gaps: ${JSON.stringify(gaps)}

Return ONLY the rewritten CV text. No commentary.`.trim();

    const tailoredCV = await callGemini(rewritePrompt, { maxTokens: 8000 });

    if (!tailoredCV || tailoredCV.trim().length < 100) {
      return NextResponse.json(
        { error: "Failed to tailor CV. Please try again." },
        { status: 502 },
      );
    }

    const comparePrompt = `Compare the original CV and the tailored CV below. List 3-5 specific changes made and why each improves the match for this role. One sentence per change.

ORIGINAL:
${cvText}

TAILORED:
${tailoredCV}

Return as JSON: {"changes": ["change 1", "change 2", ...]}`.trim();

    const compareRaw = await callGemini(comparePrompt, { maxTokens: 1000 });

    const compareClean = compareRaw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let changes: string[] = [];

    try {
      const parsed = JSON.parse(compareClean) as { changes?: unknown };
      if (Array.isArray(parsed.changes)) {
        changes = parsed.changes.filter((c): c is string => typeof c === "string");
      }
    } catch {
      const jsonMatch = compareClean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as { changes?: unknown };
          if (Array.isArray(parsed.changes)) {
            changes = parsed.changes.filter((c): c is string => typeof c === "string");
          }
        } catch { /* fall through */ }
      }
    }

    if (changes.length === 0) {
      const lines = compareClean
        .split(/\n+/)
        .map((s) => s.replace(/^\d+\.\s*/, "").replace(/^[-•*]\s*/, "").trim())
        .filter((s) => s.length > 10);
      changes = lines.length > 0
        ? lines
        : compareClean.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
    }

    if (isDev) console.log("[API /tailor-cv] Done. Changes:", changes.length);

    return NextResponse.json({ tailoredCV: tailoredCV.trim(), changes }, { status: 200 });
  } catch (error: any) {
    console.error("[API /tailor-cv] Error:", error?.message);
    const isRateLimit = error?.message?.toLowerCase().includes("429") ||
      error?.message?.toLowerCase().includes("quota");
    return NextResponse.json(
      { error: isRateLimit ? "Rate limit reached. Please wait a moment and try again." : "Failed to tailor CV. Please try again." },
      { status: isRateLimit ? 429 : 500 },
    );
  }
}
