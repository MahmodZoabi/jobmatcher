import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W = 210; // A4 mm
const PAGE_H = 297; // A4 mm

const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [20, 20, 30];
const GREY: [number, number, number] = [100, 110, 130];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip markdown bold/italic markers */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1");
}

/**
 * Clean a contact line:
 * - Remove any [Link], [Profile], [LinkedIn], [URL], or similar bracket placeholders
 * - Remove labels that preceded them: "LinkedIn: [Link]", "GitHub: [Profile]", etc.
 * - Remove bare linkedin.com / github.com URLs
 * - Remove orphaned separators
 */
function cleanContactLine(line: string): string {
  return line
    // Remove "Label: [anything]" patterns (LinkedIn: [Link], GitHub: [Profile], etc.)
    .replace(/\b(linkedin|github|portfolio|website|url|profile)\s*:\s*\[[^\]]*\]/gi, "")
    // Remove standalone "[Link]", "[Profile]", "[LinkedIn]", "[URL]", "[here]", etc.
    .replace(/\[(?:link|profile|linkedin|github|url|here|website|portfolio|view)[^\]]*\]/gi, "")
    // Remove any remaining [anything] in contact lines (always placeholders)
    .replace(/\[[^\]]{1,30}\]/g, "")
    // Remove full URLs containing linkedin or github
    .replace(/https?:\/\/(?:www\.)?(?:linkedin|github)\.com\/[^\s|,]*/gi, "")
    // Remove bare "linkedin.com/..." and "github.com/..." tokens
    .replace(/(?:linkedin|github)\.com\/[^\s|,]*/gi, "")
    // Remove standalone words: "linkedin", "github", "portfolio" (not part of email)
    .replace(/\b(?:linkedin|github|portfolio)\b[^\s|,]*/gi, "")
    // Clean up double/leading/trailing separators
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/^\s*[|,]\s*/g, "")
    .replace(/\s*[|,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Detect whether a line is a known CV section header */
const SECTION_HEADERS = new Set([
  "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "PROFILE",
  "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT", "EMPLOYMENT HISTORY",
  "EDUCATION",
  "SKILLS", "TECHNICAL SKILLS", "CORE SKILLS", "KEY SKILLS", "SOFT SKILLS",
  "PROJECTS",
  "CERTIFICATIONS", "CERTIFICATES",
  "ACHIEVEMENTS", "AWARDS",
  "LANGUAGES",
  "REFERENCES",
  "INTERESTS", "HOBBIES",
  "VOLUNTEER", "VOLUNTEERING",
  "PUBLICATIONS",
]);

/** Sections whose bullet lists are condensed into one comma-separated line */
const CONDENSABLE_SECTIONS = new Set([
  "LANGUAGES", "SOFT SKILLS", "INTERESTS", "HOBBIES", "CERTIFICATIONS", "CERTIFICATES",
]);

function isSectionHeader(line: string): boolean {
  const upper = line.trim().toUpperCase().replace(/[:\-–—]+$/, "").trim();
  return SECTION_HEADERS.has(upper);
}

function isBoldLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("**") && t.endsWith("**") && t.length > 4;
}

function isBullet(line: string): boolean {
  return /^[-•*]\s/.test(line.trim());
}

function bulletText(line: string): string {
  return stripMarkdown(line.trim().replace(/^[-•*]\s+/, ""));
}

/** Wrapped text writer — returns new Y */
function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
): number {
  const segments = doc.splitTextToSize(text, maxW);
  for (const seg of segments) {
    doc.text(seg, x, y);
    y += lh;
  }
  return y;
}

/** Build filename: "[Name] - [Label] - [JobTitle] at [Company].pdf" */
function buildFilename(name: string, label: string, jobTitle: string, company: string): string {
  const namePart = name || label;
  const rolePart = jobTitle && company
    ? `${jobTitle} at ${company}`
    : jobTitle || company || "";
  return rolePart
    ? `${namePart} - ${label} - ${rolePart}.pdf`
    : `${namePart} - ${label}.pdf`;
}

// ─── CV PDF ───────────────────────────────────────────────────────────────────

export function generateCVPdf(cvText: string, jobTitle: string, company: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const mL = 18;   // left margin
  const mR = 18;   // right margin
  const mT = 15;   // top margin
  const mB = 15;   // bottom margin
  const cW = PAGE_W - mL - mR; // content width

  // Font sizes
  const FS_NAME    = 16;
  const FS_CONTACT = 8.5;
  const FS_SECTION = 10.5;
  const FS_BOLD    = 9.5;
  const FS_BODY    = 9.5;
  const FS_BULLET  = 9.5;

  // Line heights (mm) — tight 1.2 spacing
  const LH_BODY   = 4.1;
  const LH_BULLET = 4.0;

  // ── Parse raw lines ──────────────────────────────────────────────────────────
  const rawLines = cvText.split(/\r?\n/);

  // 1. Candidate name — first non-empty line
  let candidateName = "";
  let idx = 0;
  for (; idx < rawLines.length; idx++) {
    const l = rawLines[idx].trim();
    if (l) { candidateName = stripMarkdown(l); idx++; break; }
  }

  // 2. Contact lines — next non-empty lines that look like contact info
  const rawContactPieces: string[] = [];
  let bodyStart = idx;
  for (let i = idx; i < Math.min(idx + 5, rawLines.length); i++) {
    const l = rawLines[i].trim();
    if (!l) continue;
    if (
      l.includes("@") ||
      l.includes("|") ||
      /\+?\d[\d\s\-().]{5,}/.test(l) ||
      /\b(phone|email|tel|mobile|city|location|address)\b/i.test(l) ||
      // catch lines that are ONLY link placeholders (so we skip them entirely after cleaning)
      /^\[.+\]$/.test(l)
    ) {
      const cleaned = cleanContactLine(stripMarkdown(l));
      if (cleaned) rawContactPieces.push(cleaned);
      bodyStart = i + 1;
    } else {
      break;
    }
  }

  // Flatten all contact pieces into one pipe-separated line
  const contactLine = rawContactPieces
    .join(" | ")
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .trim();

  // 3. Body lines (from bodyStart onward)
  const bodyLines = rawLines.slice(bodyStart);

  // ── Pre-process: condense bullet lists inside CONDENSABLE_SECTIONS ───────────
  interface BodyItem {
    type: "blank" | "header" | "bold" | "bullet" | "text" | "condensed";
    raw: string;        // original text (stripped)
    section?: string;   // for header: normalised section name
  }

  const items: BodyItem[] = [];
  let curSection = "";
  let pendingBullets: string[] = [];

  const flushBullets = () => {
    if (pendingBullets.length === 0) return;
    items.push({ type: "condensed", raw: pendingBullets.join(", ") });
    pendingBullets = [];
  };

  for (const raw of bodyLines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      flushBullets();
      items.push({ type: "blank", raw: "" });
      continue;
    }

    if (isSectionHeader(trimmed)) {
      flushBullets();
      const sectionName = stripMarkdown(trimmed).toUpperCase().replace(/[:\-–—]+$/, "").trim();
      curSection = sectionName;
      items.push({ type: "header", raw: sectionName, section: sectionName });
      continue;
    }

    if (isBullet(trimmed)) {
      const text = bulletText(trimmed);
      if (CONDENSABLE_SECTIONS.has(curSection)) {
        pendingBullets.push(text);
      } else {
        flushBullets();
        items.push({ type: "bullet", raw: text });
      }
      continue;
    }

    if (isBoldLine(trimmed)) {
      flushBullets();
      items.push({ type: "bold", raw: stripMarkdown(trimmed.replace(/^\*\*|\*\*$/g, "")) });
      continue;
    }

    // Inline bold or plain text
    flushBullets();
    items.push({ type: "text", raw: trimmed });
  }
  flushBullets();

  // ── Render ───────────────────────────────────────────────────────────────────
  let y = mT;

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FS_NAME);
  doc.setTextColor(...BLACK);
  doc.text(candidateName || "Candidate", mL, y);
  y += 6.5;

  // Contact — single line
  if (contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS_CONTACT);
    doc.setTextColor(...GREY);
    // Truncate to page width if needed
    const contactSegments = doc.splitTextToSize(contactLine, cW);
    doc.text(contactSegments[0], mL, y); // only first line — contact should fit
    y += 4.5;
  }

  y += 1;

  // Separator
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(mL, y, PAGE_W - mR, y);
  y += 4.5;

  // Body items
  for (const item of items) {
    switch (item.type) {
      case "blank":
        y += 1.5;
        break;

      case "header": {
        y += 2.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(FS_SECTION);
        doc.setTextColor(...BLACK);
        doc.text(item.raw, mL, y);
        y += 1.2;
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.25);
        doc.line(mL, y, PAGE_W - mR, y);
        y += 3.5;
        break;
      }

      case "bold": {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(FS_BOLD);
        doc.setTextColor(...DARK);
        y = writeWrapped(doc, item.raw, mL, y, cW, LH_BODY);
        break;
      }

      case "bullet": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BULLET);
        doc.setTextColor(...DARK);
        doc.text("–", mL, y);
        y = writeWrapped(doc, item.raw, mL + 4.5, y, cW - 4.5, LH_BULLET);
        break;
      }

      case "condensed": {
        // Single line for condensable sections (Languages, Soft Skills, etc.)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...DARK);
        y = writeWrapped(doc, item.raw, mL, y, cW, LH_BODY);
        break;
      }

      case "text": {
        // Handle inline bold segments
        if (/\*\*/.test(item.raw)) {
          const parts = item.raw.split(/\*\*(.+?)\*\*/g);
          let x = mL;
          doc.setFontSize(FS_BODY);
          doc.setTextColor(...DARK);
          for (let p = 0; p < parts.length; p++) {
            if (!parts[p]) continue;
            doc.setFont("helvetica", p % 2 === 1 ? "bold" : "normal");
            doc.text(parts[p], x, y);
            x += doc.getTextWidth(parts[p]);
          }
          y += LH_BODY;
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FS_BODY);
          doc.setTextColor(...DARK);
          y = writeWrapped(doc, stripMarkdown(item.raw), mL, y, cW, LH_BODY);
        }
        break;
      }
    }
  }

  doc.save(buildFilename(candidateName, "CV", jobTitle, company));
}

// ─── Cover Letter PDF ─────────────────────────────────────────────────────────

export function generateCoverLetterPdf(
  letterText: string,
  candidateName: string,
  jobTitle: string,
  company: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const mL = 25;
  const mR = 25;
  const mT = 28;
  const mB = 15;
  const cW = PAGE_W - mL - mR;

  const addPage = (): number => { doc.addPage(); return mT; };

  let y = mT;

  // Name header
  if (candidateName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...BLACK);
    doc.text(candidateName, mL, y);
    y += 7;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.line(mL, y, mL + 60, y);
    y += 10;
  }

  // Date
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(dateStr, mL, y);
  y += 10;

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);

  let prevWasEmpty = false;
  for (const raw of letterText.split(/\r?\n/)) {
    const trimmed = raw.trim();

    if (!trimmed) {
      if (!prevWasEmpty) y += 4;
      prevWasEmpty = true;
      continue;
    }
    prevWasEmpty = false;

    if (y > PAGE_H - mB - 10) y = addPage();

    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith("sincerely") ||
      lower.startsWith("regards") ||
      lower.startsWith("best regards") ||
      lower.startsWith("kind regards") ||
      lower.startsWith("yours sincerely")
    ) {
      y += 2;
      doc.setFont("helvetica", "italic");
      doc.text(stripMarkdown(trimmed), mL, y);
      y += 8;
      if (candidateName) {
        doc.setFont("helvetica", "bold");
        doc.text(candidateName, mL, y);
        y += 6;
      }
      continue;
    }

    const lines = doc.splitTextToSize(stripMarkdown(trimmed), cW);
    for (const line of lines) {
      if (y > PAGE_H - mB - 10) y = addPage();
      doc.setFont("helvetica", "normal");
      doc.text(line, mL, y);
      y += 6;
    }
    y += 1;
  }

  doc.save(buildFilename(candidateName, "Cover Letter", jobTitle, company));
}
