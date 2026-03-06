import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;

const BLACK: [number, number, number] = [0, 0, 0];
const DARK:  [number, number, number] = [20, 20, 30];
const GREY:  [number, number, number] = [100, 110, 130];

// ─── Text cleaning ────────────────────────────────────────────────────────────

/**
 * Strip bracket placeholders and social-media link tokens from any line.
 * Applied to every line before rendering.
 */
function cleanLine(text: string): string {
  return text
    // "Label: [placeholder]" pairs — e.g. "LinkedIn: [Link]"
    .replace(/\b(linkedin|github|portfolio|website|url|profile)\s*:\s*\[[^\]]*\]/gi, "")
    // Standalone bracket placeholders matching link-related words
    .replace(/\[(?:link|profile|linkedin|github|url|here|website|portfolio|view)[^\]]*\]/gi, "")
    // Any remaining short bracket expressions (typically all placeholders in CVs)
    .replace(/\[[^\]]{1,40}\]/g, "")
    // Full social URLs
    .replace(/https?:\/\/(?:www\.)?(?:linkedin|github)\.com\/[^\s|,]*/gi, "")
    // Bare social tokens
    .replace(/(?:linkedin|github)\.com\/[^\s|,]*/gi, "")
    // Orphaned separators after removals
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*[|·•]\s*/g, "")
    .replace(/\s*[|·•]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Strip markdown bold/italic markers, return plain text */
function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1");
}

// ─── Section header detection ─────────────────────────────────────────────────

const KNOWN_HEADERS = new Set([
  "PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "PROFILE",
  "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT", "EMPLOYMENT HISTORY",
  "EDUCATION",
  "SKILLS", "TECHNICAL SKILLS", "CORE SKILLS", "KEY SKILLS", "SOFT SKILLS",
  "PROJECTS", "PERSONAL PROJECTS", "SIDE PROJECTS",
  "CERTIFICATIONS", "CERTIFICATES",
  "ACHIEVEMENTS", "AWARDS", "HONORS",
  "LANGUAGES",
  "REFERENCES",
  "INTERESTS", "HOBBIES",
  "VOLUNTEER", "VOLUNTEERING", "COMMUNITY",
  "PUBLICATIONS",
]);

/** Sections condensed to one comma-separated line instead of bullet list */
const CONDENSABLE = new Set([
  "LANGUAGES", "SOFT SKILLS", "INTERESTS", "HOBBIES",
]);

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Known header set (normalise away trailing punctuation)
  const normalised = plain(t).toUpperCase().replace(/[:\-–—]+$/, "").trim();
  if (KNOWN_HEADERS.has(normalised)) return true;
  // All-caps short line (≤ 40 chars, no lowercase) ending optionally with colon
  if (t.length <= 40 && t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
  return false;
}

function isBullet(line: string): boolean {
  return /^[-•*]\s/.test(line.trim());
}

function extractBulletText(line: string): string {
  return plain(cleanLine(line.trim().replace(/^[-•*]\s+/, "")));
}

// ─── jsPDF helpers ────────────────────────────────────────────────────────────

function writeWrapped(
  doc: jsPDF, text: string,
  x: number, y: number, maxW: number, lh: number,
): number {
  for (const seg of doc.splitTextToSize(text, maxW)) {
    doc.text(seg, x, y);
    y += lh;
  }
  return y;
}

/** Write a line with mixed bold/normal segments from **markdown** markers */
function writeMixedBold(
  doc: jsPDF, raw: string,
  x: number, y: number, fontSize: number, lh: number,
): number {
  const parts = raw.split(/\*\*(.+?)\*\*/g);
  let cx = x;
  doc.setFontSize(fontSize);
  doc.setTextColor(...DARK);
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    doc.setFont("helvetica", i % 2 === 1 ? "bold" : "normal");
    doc.text(parts[i], cx, y);
    cx += doc.getTextWidth(parts[i]);
  }
  return y + lh;
}

// ─── Filename builder ─────────────────────────────────────────────────────────

function buildFilename(name: string, label: string, jobTitle: string, company: string): string {
  const namePart = name || label;
  const role = jobTitle && company ? `${jobTitle} at ${company}` : jobTitle || company || "";
  return role ? `${namePart} - ${label} - ${role}.pdf` : `${namePart} - ${label}.pdf`;
}

// ─── CV PDF ───────────────────────────────────────────────────────────────────

export function generateCVPdf(cvText: string, jobTitle: string, company: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const mL = 18, mR = 18, mT = 15, mB = 15;
  const cW = PAGE_W - mL - mR;

  const FS_NAME    = 16;
  const FS_CONTACT = 8.5;
  const FS_SECTION = 10.5;
  const FS_BODY    = 9.5;
  const LH_BODY    = 4.1;
  const LH_BULLET  = 4.0;

  // ── Clean + split all raw lines ──────────────────────────────────────────────
  const rawLines = cvText.split(/\r?\n/);

  // Extract candidate name from first non-empty line (for filename only)
  let candidateName = "";
  for (const l of rawLines) {
    const t = plain(cleanLine(l.trim()));
    if (t) { candidateName = t; break; }
  }

  // ── Parse all lines into typed render items ──────────────────────────────────
  type ItemType = "name" | "contact" | "separator" | "blank"
                | "header" | "bold" | "bullet" | "condensed" | "text";
  interface Item { type: ItemType; text: string }

  const items: Item[] = [];
  let lineState: "header" | "contact" | "body" = "header"; // header = first few lines
  let headerLinesSeen = 0;
  let curSection = "";
  let pendingBullets: string[] = [];

  const flushBullets = () => {
    if (!pendingBullets.length) return;
    items.push({ type: "condensed", text: pendingBullets.join(", ") });
    pendingBullets = [];
  };

  for (const raw of rawLines) {
    const cleaned = cleanLine(raw.trim());
    if (!cleaned) {
      if (lineState === "body") {
        flushBullets();
        items.push({ type: "blank", text: "" });
      }
      continue;
    }

    // ── Header zone: name + contact lines ─────────────────────────────────────
    if (lineState === "header") {
      if (headerLinesSeen === 0) {
        // First non-empty line → name
        items.push({ type: "name", text: plain(cleaned) });
        headerLinesSeen++;
        continue;
      }
      // Subsequent lines in header zone: contact info or transition to body
      const isContact =
        cleaned.includes("@") ||
        cleaned.includes("|") ||
        cleaned.includes("·") ||
        /\+?\d[\d\s\-().]{5,}/.test(cleaned) ||
        /\b(phone|email|tel|mobile|city|location|address)\b/i.test(cleaned);

      if (isContact) {
        items.push({ type: "contact", text: plain(cleaned) });
        headerLinesSeen++;
        continue;
      }
      // Not contact — transition to body, add separator, fall through
      items.push({ type: "separator", text: "" });
      lineState = "body";
    }

    // ── Body zone ─────────────────────────────────────────────────────────────
    if (lineState === "body") {
      if (isSectionHeader(cleaned)) {
        flushBullets();
        const label = plain(cleaned).toUpperCase().replace(/[:\-–—]+$/, "").trim();
        curSection = label;
        items.push({ type: "header", text: label });
        continue;
      }

      if (isBullet(cleaned)) {
        const bt = extractBulletText(cleaned);
        if (CONDENSABLE.has(curSection)) {
          pendingBullets.push(bt);
        } else {
          flushBullets();
          items.push({ type: "bullet", text: bt });
        }
        continue;
      }

      // Whole-line bold: **text**
      if (/^\*\*[^*].+[^*]\*\*$/.test(cleaned) || /^\*\*.+\*\*$/.test(cleaned)) {
        flushBullets();
        items.push({ type: "bold", text: plain(cleaned) });
        continue;
      }

      flushBullets();
      items.push({ type: "text", text: cleaned });
    }
  }
  flushBullets();

  // Add separator after the last contact line if not yet added
  const hasContact = items.some(i => i.type === "contact");
  const hasSeparator = items.some(i => i.type === "separator");
  if (hasContact && !hasSeparator) {
    const lastContactIdx = items.map(i => i.type).lastIndexOf("contact");
    items.splice(lastContactIdx + 1, 0, { type: "separator", text: "" });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  let y = mT;

  for (const item of items) {
    switch (item.type) {
      case "name":
        doc.setFont("helvetica", "bold");
        doc.setFontSize(FS_NAME);
        doc.setTextColor(...BLACK);
        doc.text(item.text, mL, y);
        y += 6;
        break;

      case "contact":
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_CONTACT);
        doc.setTextColor(...GREY);
        doc.text(doc.splitTextToSize(item.text, cW)[0], mL, y);
        y += 4;
        break;

      case "separator":
        y += 2;
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.5);
        doc.line(mL, y, PAGE_W - mR, y);
        y += 4;
        break;

      case "blank":
        y += 1.5;
        break;

      case "header":
        y += 2.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(FS_SECTION);
        doc.setTextColor(...BLACK);
        doc.text(item.text, mL, y);
        y += 1.2;
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.25);
        doc.line(mL, y, PAGE_W - mR, y);
        y += 3.5;
        break;

      case "bold":
        doc.setFont("helvetica", "bold");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...DARK);
        y = writeWrapped(doc, item.text, mL, y, cW, LH_BODY);
        break;

      case "bullet":
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...DARK);
        doc.text("–", mL, y);
        y = writeWrapped(doc, item.text, mL + 4.5, y, cW - 4.5, LH_BULLET);
        break;

      case "condensed":
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...DARK);
        y = writeWrapped(doc, item.text, mL, y, cW, LH_BODY);
        break;

      case "text":
        if (/\*\*/.test(item.text)) {
          y = writeMixedBold(doc, item.text, mL, y, FS_BODY, LH_BODY);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FS_BODY);
          doc.setTextColor(...DARK);
          y = writeWrapped(doc, plain(item.text), mL, y, cW, LH_BODY);
        }
        break;
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

  const mL = 25, mR = 25, mT = 28, mB = 15;
  const cW = PAGE_W - mL - mR;
  const FS = 11;
  const LH = 6;

  const addPage = (): number => { doc.addPage(); return mT; };

  let y = mT;
  let prevWasBlank = false;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS);
  doc.setTextColor(...DARK);

  for (const raw of letterText.split(/\r?\n/)) {
    const cleaned = cleanLine(raw.trim());

    if (!cleaned) {
      if (!prevWasBlank) y += 5; // paragraph gap
      prevWasBlank = true;
      continue;
    }
    prevWasBlank = false;

    if (y > PAGE_H - mB - 10) y = addPage();

    // Render with mixed bold if needed, otherwise plain
    if (/\*\*/.test(cleaned)) {
      y = writeMixedBold(doc, cleaned, mL, y, FS, LH);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS);
      doc.setTextColor(...DARK);
      for (const seg of doc.splitTextToSize(plain(cleaned), cW)) {
        if (y > PAGE_H - mB - 10) y = addPage();
        doc.text(seg, mL, y);
        y += LH;
      }
    }
  }

  doc.save(buildFilename(candidateName, "Cover Letter", jobTitle, company));
}
