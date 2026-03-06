import { jsPDF } from "jspdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_W = 210; // A4 mm
const PAGE_H = 297; // A4 mm

const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [20, 20, 30];
const GREY: [number, number, number] = [100, 110, 130];

/** Strip markdown bold markers from text for plain rendering */
function stripBold(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

/** Remove LinkedIn/GitHub tokens and "[Link]" placeholders from a contact line */
function cleanContactLine(line: string): string {
  return line
    .replace(/linkedin\.com\/in\/[^\s|,]*/gi, "")
    .replace(/github\.com\/[^\s|,]*/gi, "")
    .replace(/\[link\]/gi, "")
    .replace(/linkedin[^\s|,]*/gi, "")
    .replace(/github[^\s|,]*/gi, "")
    // Clean up orphaned separators/pipes left behind
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*/g, "")
    .replace(/\s*\|\s*$/g, "")
    .trim();
}

/** Detect whether a line is a section header */
const SECTION_HEADERS = new Set([
  "PROFESSIONAL SUMMARY",
  "SUMMARY",
  "EXPERIENCE",
  "WORK EXPERIENCE",
  "EMPLOYMENT",
  "EMPLOYMENT HISTORY",
  "EDUCATION",
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE SKILLS",
  "KEY SKILLS",
  "PROJECTS",
  "CERTIFICATIONS",
  "ACHIEVEMENTS",
  "LANGUAGES",
  "REFERENCES",
  "INTERESTS",
  "VOLUNTEER",
  "PUBLICATIONS",
  "AWARDS",
  "PROFILE",
]);

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase().replace(/[:\-–—]+$/, "").trim();
  return SECTION_HEADERS.has(upper);
}

function isBoldMarker(line: string): boolean {
  return line.trim().startsWith("**") && line.trim().endsWith("**");
}

/** Add wrapped text, returns new Y position */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  pageH: number,
  marginBottom: number,
  addPageFn: () => number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    if (y + lineHeight > pageH - marginBottom) {
      y = addPageFn();
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

/** Build filename: "[Name] - [Label] - [JobTitle] at [Company].pdf" */
function buildFilename(candidateName: string, label: string, jobTitle: string, company: string): string {
  const parts = [candidateName || "CV", "-", label];
  if (jobTitle || company) {
    parts.push("-");
    if (jobTitle && company) parts.push(`${jobTitle} at ${company}`);
    else parts.push(jobTitle || company);
  }
  return parts.join(" ") + ".pdf";
}

// ─── CV PDF ───────────────────────────────────────────────────────────────────

export function generateCVPdf(cvText: string, jobTitle: string, company: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const marginL = 20;
  const marginR = 20;
  const marginT = 20;
  const marginB = 15;
  const contentW = PAGE_W - marginL - marginR;

  const addPage = (): number => {
    doc.addPage();
    return marginT;
  };

  // ── Parse lines ──
  const rawLines = cvText.split(/\r?\n/);

  // Extract candidate name (first non-empty line)
  let candidateName = "";
  let startIdx = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i].trim();
    if (l) {
      candidateName = stripBold(l);
      startIdx = i + 1;
      break;
    }
  }

  // Collect contact lines — only phone, email, city (skip linkedin/github)
  const contactLines: string[] = [];
  let bodyStartIdx = startIdx;
  for (let i = startIdx; i < Math.min(startIdx + 4, rawLines.length); i++) {
    const l = rawLines[i].trim();
    if (!l) continue;
    if (
      l.includes("@") ||
      l.includes("|") ||
      /\+?\d[\d\s\-().]{6,}/.test(l)
    ) {
      const cleaned = cleanContactLine(stripBold(l));
      if (cleaned) contactLines.push(cleaned);
      bodyStartIdx = i + 1;
    } else {
      break;
    }
  }

  // ── Header ──
  let y = marginT;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  doc.text(candidateName || "Candidate Name", marginL, y);
  y += 8;

  if (contactLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    for (const cl of contactLines) {
      doc.text(cl, marginL, y);
      y += 5;
    }
  }

  y += 2;

  // Separator line — black
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.6);
  doc.line(marginL, y, PAGE_W - marginR, y);
  y += 6;

  // ── Body ──
  for (let i = bodyStartIdx; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      y += 2.5;
      continue;
    }

    if (isSectionHeader(trimmed)) {
      y += 2;
      if (y > PAGE_H - marginB - 20) y = addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BLACK);
      const label = stripBold(trimmed).toUpperCase().replace(/[:\-–—]+$/, "");
      doc.text(label, marginL, y);
      y += 1.5;

      // Underline — black
      doc.setDrawColor(...BLACK);
      doc.setLineWidth(0.3);
      doc.line(marginL, y, PAGE_W - marginR, y);
      y += 5;
      continue;
    }

    // Bold line (e.g. **Job Title — Company**)
    if (isBoldMarker(trimmed)) {
      if (y > PAGE_H - marginB - 10) y = addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...DARK);
      const text = trimmed.replace(/^\*\*|\*\*$/g, "");
      y = addWrappedText(doc, text, marginL, y, contentW, 5.2, PAGE_H, marginB, addPage);
      continue;
    }

    // Bullet point
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      if (y > PAGE_H - marginB - 8) y = addPage();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      const bulletText = stripBold(trimmed.slice(2));
      doc.text("•", marginL + 1, y);
      y = addWrappedText(doc, bulletText, marginL + 6, y, contentW - 6, 5, PAGE_H, marginB, addPage);
      continue;
    }

    // Inline bold segments
    if (/\*\*/.test(trimmed)) {
      if (y > PAGE_H - marginB - 8) y = addPage();
      const parts = trimmed.split(/\*\*(.+?)\*\*/g);
      let x = marginL;
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      for (let p = 0; p < parts.length; p++) {
        if (!parts[p]) continue;
        doc.setFont("helvetica", p % 2 === 1 ? "bold" : "normal");
        doc.text(parts[p], x, y);
        x += doc.getTextWidth(parts[p]);
      }
      y += 5;
      continue;
    }

    // Normal text
    if (y > PAGE_H - marginB - 8) y = addPage();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    y = addWrappedText(doc, stripBold(trimmed), marginL, y, contentW, 5, PAGE_H, marginB, addPage);
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

  const marginL = 25;
  const marginR = 25;
  const marginT = 28;
  const marginB = 15;
  const contentW = PAGE_W - marginL - marginR;

  const addPage = (): number => {
    doc.addPage();
    return marginT;
  };

  let y = marginT;

  // ── Candidate name header ──
  if (candidateName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...BLACK);
    doc.text(candidateName, marginL, y);
    y += 7;

    // Thin black accent line under name
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.4);
    doc.line(marginL, y, marginL + 60, y);
    y += 10;
  }

  // ── Date ──
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text(dateStr, marginL, y);
  y += 10;

  // ── Body paragraphs ──
  const lines = letterText.split(/\r?\n/);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...DARK);

  let prevWasEmpty = false;
  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      if (!prevWasEmpty) y += 4;
      prevWasEmpty = true;
      continue;
    }
    prevWasEmpty = false;

    if (y > PAGE_H - marginB - 10) y = addPage();

    // Detect sign-off lines
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
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(stripBold(trimmed), marginL, y);
      y += 8;
      if (candidateName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(candidateName, marginL, y);
        y += 6;
      }
      continue;
    }

    y = addWrappedText(doc, stripBold(trimmed), marginL, y, contentW, 6, PAGE_H, marginB, addPage);
    y += 1;
  }

  doc.save(buildFilename(candidateName, "Cover Letter", jobTitle, company));
}
