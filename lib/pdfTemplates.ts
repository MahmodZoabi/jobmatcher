import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;

const BLACK: [number, number, number] = [0, 0, 0];

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
    // All HTTP/HTTPS URLs
    .replace(/https?:\/\/[^\s|,]*/gi, "")
    // Bare social tokens
    .replace(/(?:linkedin|github)\.com\/[^\s|,]*/gi, "")
    // Orphaned separators after removals
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*[|·•]\s*/g, "")
    .replace(/\s*[|·•]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Strip markdown bold/italic markers and raw asterisks, return plain text */
function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\*/g, "");
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
  doc.setTextColor(...BLACK);
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

type ItemType = "name" | "contact" | "separator" | "blank"
              | "header" | "bold" | "bullet" | "condensed" | "text";
interface CVItem { type: ItemType; text: string }

function parseCVItems(cvText: string): { items: CVItem[]; candidateName: string } {
  const rawLines = cvText.split(/\r?\n/);
  let candidateName = "";
  for (const l of rawLines) {
    const t = plain(cleanLine(l.trim()));
    if (t) { candidateName = t; break; }
  }

  const items: CVItem[] = [];
  let lineState: "header" | "body" = "header";
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

    if (lineState === "header") {
      if (headerLinesSeen === 0) {
        items.push({ type: "name", text: plain(cleaned) });
        headerLinesSeen++;
        continue;
      }
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
      items.push({ type: "separator", text: "" });
      lineState = "body";
    }

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

  const hasContact = items.some(i => i.type === "contact");
  const hasSeparator = items.some(i => i.type === "separator");
  if (hasContact && !hasSeparator) {
    const lastContactIdx = items.map(i => i.type).lastIndexOf("contact");
    items.splice(lastContactIdx + 1, 0, { type: "separator", text: "" });
  }

  return { items, candidateName };
}

interface CVRenderConfig {
  mL: number; mR: number; mT: number; mB: number;
  FS_NAME: number; FS_CONTACT: number; FS_SECTION: number;
  FS_BODY: number; LH_BODY: number; LH_BULLET: number;
}

function renderCVItems(doc: jsPDF, items: CVItem[], cfg: CVRenderConfig): number {
  const { mL, mR, mT, FS_NAME, FS_CONTACT, FS_SECTION, FS_BODY, LH_BODY, LH_BULLET } = cfg;
  const cW = PAGE_W - mL - mR;
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
        doc.setTextColor(...BLACK);
        doc.text(doc.splitTextToSize(item.text, cW)[0], mL, y);
        y += 3.5;
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
        doc.setTextColor(...BLACK);
        y = writeWrapped(doc, item.text, mL, y, cW, LH_BODY);
        break;

      case "bullet":
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...BLACK);
        doc.text("–", mL, y);
        y = writeWrapped(doc, item.text, mL + 4.5, y, cW - 4.5, LH_BULLET);
        break;

      case "condensed":
        doc.setFont("helvetica", "normal");
        doc.setFontSize(FS_BODY);
        doc.setTextColor(...BLACK);
        y = writeWrapped(doc, item.text, mL, y, cW, LH_BODY);
        break;

      case "text":
        if (/\*\*/.test(item.text)) {
          y = writeMixedBold(doc, item.text, mL, y, FS_BODY, LH_BODY);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(FS_BODY);
          doc.setTextColor(...BLACK);
          y = writeWrapped(doc, plain(item.text), mL, y, cW, LH_BODY);
        }
        break;
    }
  }
  return y;
}

const CV_CONFIGS: CVRenderConfig[] = [
  { mL: 18, mR: 18, mT: 15, mB: 15, FS_NAME: 15,   FS_CONTACT: 8.5, FS_SECTION: 10,  FS_BODY: 10,  LH_BODY: 4.4,  LH_BULLET: 4.3  },
  { mL: 18, mR: 18, mT: 14, mB: 14, FS_NAME: 14,   FS_CONTACT: 8,   FS_SECTION: 9.5, FS_BODY: 9,   LH_BODY: 4.15, LH_BULLET: 4.05 },
  { mL: 12, mR: 12, mT: 12, mB: 12, FS_NAME: 13.5, FS_CONTACT: 7.5, FS_SECTION: 9,   FS_BODY: 8.5, LH_BODY: 3.9,  LH_BULLET: 3.8  },
];

export function generateCVPdf(cvText: string, jobTitle: string, company: string) {
  const { items, candidateName } = parseCVItems(cvText);

  for (let i = 0; i < CV_CONFIGS.length; i++) {
    const cfg = CV_CONFIGS[i];
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const finalY = renderCVItems(doc, items, cfg);
    const maxY = PAGE_H - cfg.mB;

    if (finalY <= maxY || i === CV_CONFIGS.length - 1) {
      doc.save(buildFilename(candidateName, "CV", jobTitle, company));
      return;
    }
    // Otherwise try next (smaller) config
  }
}

// ─── Cover Letter PDF ─────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

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

  let y = mT;
  let prevWasBlank = false;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FS);
  doc.setTextColor(...BLACK);

  // Date line at top
  doc.text(formatDate(new Date()), mL, y);
  y += LH * 2;

  for (const raw of letterText.split(/\r?\n/)) {
    if (y > PAGE_H - mB) break; // one page only

    const cleaned = cleanLine(raw.trim());

    if (!cleaned) {
      if (!prevWasBlank) y += 5; // paragraph gap
      prevWasBlank = true;
      continue;
    }
    prevWasBlank = false;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(FS);
    doc.setTextColor(...BLACK);
    for (const seg of doc.splitTextToSize(plain(cleaned), cW)) {
      if (y > PAGE_H - mB) break;
      doc.text(seg, mL, y);
      y += LH;
    }
  }

  doc.save(buildFilename(candidateName, "Cover Letter", jobTitle, company));
}
