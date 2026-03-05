"use client";

import React, { useState } from "react";
import ScoreRing from "./ScoreRing";
import type { JobWithMeta } from "./JobCard";

type JobWithExtras = JobWithMeta & {
  coverLetter?: string;
  tailoredCV?: string;
  changes?: string[];
  listingText?: string;
};

type Tab = "analysis" | "cover-letter" | "tailored-cv" | "original-listing";

type DetailPanelProps = {
  job: JobWithExtras | null;
  cvText: string;
  onGenerateCover: () => Promise<void>;
  onTailorCV: () => Promise<void>;
};

// Simple markdown renderer: ## headers, **bold**, newlines
function renderMarkdown(text: string): string {
  // Escape HTML first
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = safe.split("\n");
  const html = lines.map((line) => {
    if (line.startsWith("## ")) {
      return `<h2 style="font-size:1rem;font-weight:700;color:#f1f5f9;margin:0.85rem 0 0.3rem">${applyInline(line.slice(3))}</h2>`;
    }
    if (line.startsWith("### ")) {
      return `<h3 style="font-size:0.9rem;font-weight:600;color:#e2e8f0;margin:0.6rem 0 0.2rem">${applyInline(line.slice(4))}</h3>`;
    }
    if (line.startsWith("# ")) {
      return `<h1 style="font-size:1.1rem;font-weight:700;color:#f8fafc;margin:1rem 0 0.35rem">${applyInline(line.slice(2))}</h1>`;
    }
    if (line.trim() === "") return `<div style="height:0.4rem"></div>`;
    return `<p style="margin:0.1rem 0;line-height:1.6">${applyInline(line)}</p>`;
  });
  return html.join("");
}

function applyInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string")
    return value.split(/[\n•\-,]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function copyText(text: string) {
  if (navigator?.clipboard) {
    navigator.clipboard.writeText(text).catch(console.error);
  }
}

function downloadTxt(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Sub-tab views ────────────────────────────────────────────────────────────

const AnalysisTab: React.FC<{ job: JobWithExtras }> = ({ job }) => {
  const score = Math.round(job.score ?? 0);
  const strengths = normalizeList(job.strengths);
  const missingSkills = normalizeList(job.missingSkills);
  const gaps = normalizeList(job.gaps);
  const tips = normalizeList(job.tips);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Score ring centred */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <ScoreRing score={score} size={130} />
        {job.summary && (
          <p className="text-sm text-slate-300 text-center max-w-lg leading-relaxed px-2">
            {job.summary}
          </p>
        )}
      </div>

      {/* Strengths + Missing skills side by side */}
      {(strengths.length > 0 || missingSkills.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/40 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
                Strengths
              </h3>
              <ul className="space-y-1.5">
                {strengths.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-200">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missingSkills.length > 0 && (
            <div className="rounded-xl bg-rose-950/30 border border-rose-800/40 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-2">
                Missing Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="rounded-xl bg-amber-950/20 border border-amber-800/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">
            Gaps
          </h3>
          <ul className="space-y-1.5">
            {gaps.map((gap, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-200">
                <span className="text-amber-400 mt-0.5 shrink-0">—</span>
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className="rounded-xl bg-sky-950/20 border border-sky-800/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-2">
            Tips
          </h3>
          <ul className="space-y-1.5">
            {tips.map((tip, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-200">
                <span className="text-sky-400 mt-0.5 shrink-0">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const CoverLetterTab: React.FC<{
  job: JobWithExtras;
  cvText: string;
  onGenerate: () => Promise<void>;
}> = ({ job, cvText, onGenerate }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serversBusy, setServersBusy] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setServersBusy(false);
    try {
      await onGenerate();
    } catch (err: any) {
      const m = (err.message || "").toLowerCase();
      if (m.includes("ai servers are busy") || err.allModelsFailed) {
        setServersBusy(true);
        setError("AI servers are busy. Please try again in a few seconds.");
      } else if (err.status === 429 || m.includes("rate limit") || m.includes("daily limit")) {
        setError("Daily limit reached. Come back tomorrow!");
      } else if (m.includes("timeout") || m.includes("took too long")) {
        setError("Request took too long. Please try again.");
      } else {
        setError(err.message || "Failed to generate. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!job.coverLetter) return;
    copyText(job.coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job.coverLetter) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-slate-400 text-sm text-center max-w-xs">
          Generate a tailored cover letter for{" "}
          <span className="text-slate-200">{job.title}</span>
          {job.company ? ` at ${job.company}` : ""}.
        </div>
        {error && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200 max-w-xs text-center">
              {error}
            </div>
            {serversBusy && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/40 px-4 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-950/70 transition"
              >
                Retry
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !cvText}
          className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-[#3b82f6]/30 hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading && (
            <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "Generating..." : "Generate Cover Letter"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#3b82f6]/50 hover:text-white transition"
        >
          {copied ? "✓ Copied!" : "Copy to clipboard"}
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-50 transition"
        >
          {loading && (
            <span className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed w-full">
        {job.coverLetter}
      </div>
    </div>
  );
};

const TailoredCVTab: React.FC<{
  job: JobWithExtras;
  cvText: string;
  onTailor: () => Promise<void>;
}> = ({ job, cvText, onTailor }) => {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"tailored" | "original">("tailored");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serversBusy, setServersBusy] = useState(false);

  const handleTailor = async () => {
    setLoading(true);
    setError(null);
    setServersBusy(false);
    try {
      await onTailor();
    } catch (err: any) {
      const m = (err.message || "").toLowerCase();
      if (m.includes("ai servers are busy") || err.allModelsFailed) {
        setServersBusy(true);
        setError("AI servers are busy. Please try again in a few seconds.");
      } else if (err.status === 429 || m.includes("rate limit") || m.includes("daily limit")) {
        setError("Daily limit reached. Come back tomorrow!");
      } else if (m.includes("timeout") || m.includes("took too long")) {
        setError("Request took too long. Please try again.");
      } else {
        setError(err.message || "Failed to tailor CV. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = view === "tailored" ? job.tailoredCV! : cvText;
    copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = view === "tailored" ? job.tailoredCV! : cvText;
    const filename = view === "tailored"
      ? `tailored-cv-${job.company || "job"}.txt`.toLowerCase().replace(/\s+/g, "-")
      : "original-cv.txt";
    downloadTxt(text, filename);
  };

  const changes = job.changes ?? [];

  if (!job.tailoredCV) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-slate-400 text-sm text-center max-w-xs">
          Tailor your CV specifically for{" "}
          <span className="text-slate-200">{job.title}</span>
          {job.company ? ` at ${job.company}` : ""}.
        </div>
        {error && (
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200 max-w-xs text-center">
              {error}
            </div>
            {serversBusy && (
              <button
                type="button"
                onClick={handleTailor}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/40 px-4 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-950/70 transition"
              >
                Retry
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={handleTailor}
          disabled={loading || !cvText}
          className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-[#3b82f6]/30 hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading && (
            <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "Tailoring CV..." : "Tailor CV for This Job"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Changes made */}
      {changes.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Changes made
          </h3>
          <ul className="space-y-1.5">
            {changes.map((change, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-slate-200">
                <span className="text-[#3b82f6] mt-0.5 shrink-0">✎</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View toggle + action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-slate-900 p-0.5 border border-slate-700/60">
          <button
            type="button"
            onClick={() => setView("tailored")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              view === "tailored" ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tailored CV
          </button>
          <button
            type="button"
            onClick={() => setView("original")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              view === "original" ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Original CV
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:border-[#3b82f6]/50 transition"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:border-slate-500 transition"
        >
          Download .txt
        </button>
        <button
          type="button"
          onClick={handleTailor}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 disabled:opacity-50 transition"
        >
          {loading && (
            <span className="h-3 w-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? "Re-tailoring..." : "Re-tailor"}
        </button>
      </div>

      {/* CV content */}
      <div
        className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-200 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(view === "tailored" ? job.tailoredCV! : cvText),
        }}
      />
    </div>
  );
};

const OriginalListingTab: React.FC<{ job: JobWithExtras }> = ({ job }) => {
  if (!job.listingText && !job.url) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
        No original listing text available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {job.url && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Source:</span>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#3b82f6] hover:text-[#60a5fa] underline underline-offset-2 truncate"
          >
            {job.url}
          </a>
        </div>
      )}
      {job.listingText ? (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-xs">
          {job.listingText}
        </div>
      ) : (
        <div className="text-sm text-slate-500">
          Listing text was not captured. Re-analyze the job to store it.
        </div>
      )}
    </div>
  );
};

// ─── Main DetailPanel ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "analysis", label: "Analysis" },
  { id: "cover-letter", label: "Cover Letter" },
  { id: "tailored-cv", label: "Tailored CV" },
  { id: "original-listing", label: "Original Listing" },
];

const DetailPanel: React.FC<DetailPanelProps> = ({
  job,
  cvText,
  onGenerateCover,
  onTailorCV,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  if (!job) {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
        <span className="text-2xl opacity-30">←</span>
        <span>Select a job to see the full analysis</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-[#080d1a] overflow-hidden">
      {/* Job header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800/60">
        <h2 className="text-base font-semibold text-slate-50 truncate">
          {job.title || "Untitled role"}
        </h2>
        <p className="text-sm text-slate-400 truncate">{job.company || "Unknown company"}</p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex gap-1.5 px-4 py-2.5 border-b border-slate-800/60 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[#3b82f6] text-white shadow-sm shadow-[#3b82f6]/40"
                : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-6">
        {activeTab === "analysis" && <AnalysisTab job={job} />}
        {activeTab === "cover-letter" && (
          <CoverLetterTab job={job} cvText={cvText} onGenerate={onGenerateCover} />
        )}
        {activeTab === "tailored-cv" && (
          <TailoredCVTab job={job} cvText={cvText} onTailor={onTailorCV} />
        )}
        {activeTab === "original-listing" && <OriginalListingTab job={job} />}
      </div>
    </div>
  );
};

export type { JobWithExtras };
export default DetailPanel;
