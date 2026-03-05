import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cvText, jobText, url } = body as {
      cvText?: string;
      jobText?: string;
      url?: string;
    };

    if (!cvText || !jobText) {
      return NextResponse.json(
        { error: 'Missing "cvText" or "jobText" in request body' },
        { status: 400 },
      );
    }

    if (isDev) console.log("[API /analyze] Running analysis");

    const prompt = `You are an experienced hiring manager reviewing this candidate's CV against the job listing. Give your honest professional assessment.

Read the job listing carefully. Identify what the role truly requires — not just the listed requirements, but what kind of person would actually succeed in this role.

Then read the CV. Consider the full picture: education, experience, skills, projects, and the trajectory of this person's career.
${url ? `\nThe job was found at this URL: ${url} — use the domain to infer company name if not stated.\n` : ""}
Now score the match from 0-100 based on your professional judgment:

- Would you interview this person? If yes, score should be 65+
- Would you consider them a strong candidate? If yes, score should be 75+
- Would you hire them over other typical applicants? If yes, score should be 85+
- Are they clearly unqualified? Score should be below 40

Think about:
- Do they have the core technical skills the role demands?
- Is their experience level appropriate? (Don't penalize juniors for applying to junior roles)
- Is their education relevant? (STEM degrees — including Industrial Engineering — are generally relevant for tech and product roles)
- Do they have transferable skills that aren't an exact keyword match but still valuable?
- Would their background bring useful perspective to this role?
- Are there any red flags or dealbreakers?

Be honest and calibrated. Most candidates who apply to jobs they found through regular job searching score between 40-70. A score above 80 is exceptional and rare. A score below 30 means they probably applied to the wrong job.

After scoring, assign a priority:
- 75+: priority 1 — Top Priority, strong match, apply immediately
- 55-74: priority 2 — Worth Applying, good chance with a tailored application
- 35-54: priority 3 — Long Shot, significant gaps but not impossible
- Below 35: priority 4 — Weak Match, consider other roles instead

Return ONLY valid JSON (no markdown, no backticks):
{"title":"job title","company":"company name (infer from URL or context, never return Unknown)","score":number 0-100,"priority":1-4,"summary":"2-3 sentence honest assessment","matchingSkills":["skill1"],"missingSkills":["skill1"],"strengths":["strength1"],"gaps":["gap1"],"tips":["tip1"]}

CV:
${cvText}

JOB LISTING:
${jobText}`.trim();

    let raw: string;
    try {
      raw = await callClaude(prompt, { maxTokens: 2000 });
    } catch (aiError: any) {
      console.error("[API /analyze] Claude call failed:", aiError?.message);
      return NextResponse.json(
        { error: "Analysis failed. Please try again." },
        { status: 502 },
      );
    }

    // Strip markdown fences
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      // Fallback: try to extract a JSON object embedded in surrounding text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]) as Record<string, unknown>;
        } catch {
          console.error("[API /analyze] JSON parse failed after regex fallback");
          return NextResponse.json(
            { error: "Analysis returned unexpected format. Please try again." },
            { status: 502 },
          );
        }
      } else {
        console.error("[API /analyze] No JSON found in Claude response");
        return NextResponse.json(
          { error: "Analysis returned unexpected format. Please try again." },
          { status: 502 },
        );
      }
    }

    // Sanitise critical fields
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    const priority = [1, 2, 3, 4].includes(Number(parsed.priority))
      ? Number(parsed.priority)
      : score >= 75 ? 1 : score >= 55 ? 2 : score >= 35 ? 3 : 4;

    const safe = {
      ...parsed,
      score,
      priority,
      title: (parsed.title as string)?.trim() || "Unknown Position",
      company: (parsed.company as string)?.trim() || "Unknown Company",
    };

    if (isDev) console.log("[API /analyze] Score:", safe.score, "Priority:", safe.priority);

    return NextResponse.json(safe, { status: 200 });
  } catch (error: any) {
    console.error("[API /analyze] Unexpected error:", error?.message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
