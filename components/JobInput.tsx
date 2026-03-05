"use client";

import React, { useState } from "react";

type AnalysisResult = {
  title?: string;
  company?: string;
  score?: number;
  priority?: number;
  summary?: string;
  matchingSkills?: string[] | string;
  missingSkills?: string[] | string;
  strengths?: string[] | string;
  gaps?: string[] | string;
  tips?: string[] | string;
  url?: string;
  listingText?: string;
};

type JobInputProps = {
  cvText: string;
  onJobAnalyzed: (result: AnalysisResult) => void;
  compact?: boolean;
  remainingAnalyses?: number;
  maxAnalyses?: number;
};

function friendlyError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit") || m.includes("daily limit") || m.includes("quota")) {
    return "Daily limit reached. Come back tomorrow!";
  }
  if (m.includes("timeout") || m.includes("took too long") || m.includes("timed out")) {
    return "Request took too long. Try again or paste the text directly.";
  }
  if (m.includes("connection") || m.includes("failed to fetch") || m.includes("networkerror")) {
    return "Connection failed. Check your internet.";
  }
  if (status === 500 || m.includes("something went wrong")) {
    return "Something went wrong. Please try again.";
  }
  return message;
}

const JobInput: React.FC<JobInputProps> = ({ cvText, onJobAnalyzed, compact = false, remainingAnalyses, maxAnalyses = 10 }) => {
  const [mode, setMode] = useState<"text" | "url">("url");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isColdStartError, setIsColdStartError] = useState(false);

  const handleAnalyzeText = async () => {
    const trimmed = jobText.trim();
    if (!trimmed) {
      setError("Please paste a job description first.");
      return;
    }

    setLoading(true);
    setStatus("Analyzing...");
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobText: trimmed }),
      });

      const data = (await res.json()) as AnalysisResult & { error?: string };
      if (!res.ok) throw Object.assign(new Error(data.error || "Analysis failed."), { status: res.status });

      onJobAnalyzed({ ...data, listingText: trimmed });
      setStatus(null);
      setJobText("");
    } catch (err: any) {
      setError(friendlyError(err.message || "Something went wrong.", err.status));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    const url = jobUrl.trim();
    if (!url) {
      setError("Please paste a job URL first.");
      return;
    }

    setLoading(true);
    setStatus("Fetching listing...");
    setError(null);
    setIsColdStartError(false);

    try {
      const doScrape = async () =>
        fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }).catch(() => { throw Object.assign(new Error("Connection failed. Check your internet."), { status: 0 }); });

      let scrapeRes = await doScrape();
      let scraped = (await scrapeRes.json()) as { text?: string; error?: string; coldStart?: boolean };

      // Auto-retry once on cold start (503 / timeout)
      if ((scrapeRes.status === 503 || scrapeRes.status === 0) && scraped.coldStart) {
        setStatus("Waking up scraper service... retrying");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        scrapeRes = await doScrape();
        scraped = (await scrapeRes.json()) as { text?: string; error?: string; coldStart?: boolean };
      }

      if (!scrapeRes.ok) {
        const err = Object.assign(new Error(scraped.error || "Failed to load that page."), {
          status: scrapeRes.status,
          coldStart: scraped.coldStart,
        });
        throw err;
      }
      if (!scraped.text) throw new Error("No job content found on that page. Try pasting the text directly.");

      setStatus("Analyzing...");

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobText: scraped.text, url }),
      }).catch(() => { throw Object.assign(new Error("Connection failed. Check your internet."), { status: 0 }); });

      const data = (await analyzeRes.json()) as AnalysisResult & { error?: string };
      if (!analyzeRes.ok) throw Object.assign(new Error(data.error || "Analysis failed."), { status: analyzeRes.status });

      onJobAnalyzed({ ...data, url, listingText: scraped.text });
      setStatus(null);
      setJobUrl("");
    } catch (err: any) {
      setIsColdStartError(!!err.coldStart);
      setError(err.coldStart ? err.message : friendlyError(err.message || "Something went wrong.", err.status));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === "text") handleAnalyzeText();
    else handleAnalyzeUrl();
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {/* Mode toggle */}
        <div className="inline-flex rounded-full bg-slate-900 p-0.5 border border-slate-700/60 self-start">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              mode === "url" ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            URL
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`px-3 py-1 text-xs rounded-full transition ${
              mode === "text" ? "bg-[#3b82f6] text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Paste
          </button>
        </div>

        {mode === "url" ? (
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 min-w-0 rounded-lg bg-slate-900/80 border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-[#3b82f6] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              placeholder="https://company.com/job/..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !jobUrl.trim() || remainingAnalyses === 0}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="h-3 w-3 border border-white/80 border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? status || "..." : "Analyze"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full h-24 rounded-lg bg-slate-900/80 border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-[#3b82f6] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 resize-none"
              placeholder="Paste job description here..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !jobText.trim() || remainingAnalyses === 0}
              className="self-end inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="h-3 w-3 border border-white/80 border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? status || "..." : "Analyze"}
            </button>
          </div>
        )}

        {remainingAnalyses !== undefined && (
          <p className={`text-[10px] text-right ${remainingAnalyses <= 2 ? "text-amber-400" : "text-slate-500"}`}>
            {remainingAnalyses}/{maxAnalyses} remaining today
          </p>
        )}

        {error && (
          <p className={`text-[11px] ${isColdStartError ? "text-blue-300" : "text-red-300"}`}>{error}</p>
        )}
      </div>
    );
  }

  // Full (non-compact) mode kept for other uses
  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-50">
            Add a job to analyze
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Paste a job description or URL. We&apos;ll score how well your CV matches.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-900 p-1 border border-slate-700">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`px-3 py-1.5 text-xs md:text-sm rounded-full transition ${
              mode === "text" ? "bg-[#3b82f6] text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-3 py-1.5 text-xs md:text-sm rounded-full transition ${
              mode === "url" ? "bg-[#3b82f6] text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Paste URL
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <div className="space-y-3">
          <textarea
            className="w-full h-40 rounded-xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/80 focus:border-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            placeholder="Paste the full job description here..."
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{jobText.trim().split(/\s+/).filter(Boolean).length} words</span>
            {status && <span className="text-[#3b82f6]">{status}</span>}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAnalyzeText}
              disabled={loading || !jobText.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-4 py-2 text-xs md:text-sm font-medium text-white shadow-md shadow-[#3b82f6]/30 transition hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
              <span>Analyze Match</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="url"
            className="w-full rounded-full bg-slate-950/60 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/80 focus:border-transparent px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            placeholder="https://company.com/job/senior-frontend-engineer"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>We&apos;ll scrape the page and extract the job only.</span>
            {status && <span className="text-[#3b82f6]">{status}</span>}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAnalyzeUrl}
              disabled={loading || !jobUrl.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-4 py-2 text-xs md:text-sm font-medium text-white shadow-md shadow-[#3b82f6]/30 transition hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
              <span>Fetch and Analyze</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={`mt-3 rounded-lg px-3 py-2 text-xs md:text-sm ${
          isColdStartError
            ? "border border-blue-500/40 bg-blue-950/40 text-blue-200"
            : "border border-red-500/40 bg-red-950/40 text-red-200"
        }`}>
          {error}
        </div>
      )}
    </div>
  );
};

export type { AnalysisResult };
export default JobInput;
