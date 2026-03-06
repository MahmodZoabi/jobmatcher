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

    const rewritePrompt = `You are an expert CV writer whose job is to make this candidate look like the best possible fit for this specific role.

YOUR GOAL: A recruiter reads this CV and thinks 'this person was made for this job.' Every line should connect the candidate to what the job requires.

STRATEGY:
- Read the job listing carefully. Identify the key requirements: required skills, responsibilities, qualifications, and the type of person they want.
- Now go through the candidate's ENTIRE background — experience, projects, education, and everything they've done — and find every connection to those requirements, even indirect ones.
- INFER relevant skills from their experience that they didn't explicitly list, but ONLY if those skills are relevant to THIS job. For example: if the job requires 'resource planning' and the candidate managed 50 people, add 'resource planning'. If the job requires 'data modeling' and they built a database project, add 'data modeling'. Don't add skills that aren't relevant to the target role.
- Rewrite bullet points to mirror the job's language. If the job says 'cross-functional collaboration' and the candidate worked across teams, use that exact phrase.
- Reorder sections so the most relevant content appears first. If the job values skills over education, put skills higher. If it values experience, lead with that.
- The Professional Summary should be 2-3 sentences that directly address what the job is looking for and why this candidate delivers it.

CRITICAL CONSTRAINTS:
- The CV MUST fit on ONE page. Maximum 3000 characters. This is non-negotiable.
- Prioritize ruthlessly. Only include what strengthens the case for THIS job.
- Skills section: pick the 8-12 most relevant skills only. Group them logically.
- Projects: pick 2-3 most relevant, 2 bullet points each max.
- Employment: 3-4 bullet points max per role, rewritten to emphasize relevance to the target job.
- Languages and soft skills: one line each.
- NEVER invent experience or skills the candidate doesn't have. Only reframe, reorder, and surface what's already there.
- Do NOT include LinkedIn links, profile links, URLs, or placeholders like [Link] or [Profile].
- Contact info: Name, Phone, Email, City — one or two lines max.
- Section headers in ALL CAPS.
- Output clean plain text only.

CANDIDATE CV:
${cvText}

JOB LISTING:
${jobText}

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
