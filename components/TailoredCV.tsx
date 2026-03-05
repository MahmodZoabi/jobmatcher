"use client";

import React, { useState } from "react";

type TailoredCVProps = {
  originalCV: string;
  tailoredCV: string;
  changes: string[];
  jobTitle?: string;
  company?: string;
};

const TailoredCV: React.FC<TailoredCVProps> = ({
  originalCV,
  tailoredCV,
  changes,
  jobTitle,
  company,
}) => {
  const [view, setView] = useState<"tailored" | "original">("tailored");

  const handleCopy = () => {
    const text = view === "tailored" ? tailoredCV : originalCV;
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("[TailoredCV] Failed to copy:", err);
    });
  };

  const downloadTxt = () => {
    const text = view === "tailored" ? tailoredCV : originalCV;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (view === "tailored" ? "tailored-cv" : "original-cv") + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-lg md:text-xl font-semibold text-slate-50"
            style={{ fontFamily: "var(--font-display)" }}
          >
            CV Tailored for{" "}
            {jobTitle ? jobTitle : "Selected Role"}
            {company ? ` at ${company}` : ""}
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Compare the original and tailored versions, then copy or download
            your preferred version.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-white shadow shadow-[#3b82f6]/40 hover:bg-[#2563eb] transition"
          >
            Copy to clipboard
          </button>
          <button
            type="button"
            onClick={downloadTxt}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 border border-slate-700 hover:bg-slate-900 transition"
          >
            Download as .txt
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-800 cursor-not-allowed"
          >
            Download as .docx (coming soon)
          </button>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-[0.18em] mb-1.5">
            Changes made
          </h3>
          <ul className="list-disc list-inside text-xs md:text-sm text-slate-300 space-y-1">
            {changes.map((change, idx) => (
              <li key={idx}>{change}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="inline-flex rounded-full bg-slate-900 p-1 border border-slate-800 self-start">
          <button
            type="button"
            onClick={() => setView("tailored")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              view === "tailored"
                ? "bg-[#3b82f6] text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Tailored CV
          </button>
          <button
            type="button"
            onClick={() => setView("original")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              view === "original"
                ? "bg-[#3b82f6] text-white shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Original CV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-950/80 border border-slate-900 p-3 text-xs md:text-sm text-slate-200 whitespace-pre-line max-h-96 overflow-y-auto">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              {view === "tailored" ? "Tailored CV" : "Original CV"}
            </h4>
            {view === "tailored" ? tailoredCV : originalCV}
          </div>

          <div className="hidden lg:block rounded-xl bg-slate-950/40 border border-slate-900/60 p-3 text-xs md:text-sm text-slate-300 whitespace-pre-line max-h-96 overflow-y-auto">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              {view === "tailored" ? "Original CV (for comparison)" : "Tailored CV (for comparison)"}
            </h4>
            {view === "tailored" ? originalCV : tailoredCV}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailoredCV;

