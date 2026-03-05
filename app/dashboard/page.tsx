"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";
import CVUpload from "@/components/CVUpload";
import JobInput, { AnalysisResult } from "@/components/JobInput";
import JobCard from "@/components/JobCard";
import DetailPanel, { JobWithExtras } from "@/components/DetailPanel";

const MAX_DAILY = 10;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadDailyCount(): number {
  try {
    const raw = localStorage.getItem("jm_analyses");
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw) as { date: string; count: number };
    return date === getTodayKey() ? (count ?? 0) : 0;
  } catch {
    return 0;
  }
}

function incrementDailyCount(): number {
  const count = loadDailyCount() + 1;
  localStorage.setItem("jm_analyses", JSON.stringify({ date: getTodayKey(), count }));
  return count;
}

const DashboardPage: React.FC = () => {
  const [cvText, setCvText] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobWithExtras[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    setUsedToday(loadDailyCount());
  }, []);

  const remainingAnalyses = Math.max(0, MAX_DAILY - usedToday);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const topScore = useMemo(
    () => (jobs.length ? Math.max(...jobs.map((j) => j.score ?? 0)) : 0),
    [jobs],
  );

  const addJob = (result: AnalysisResult) => {
    setJobError(null);
    const title = (result.title ?? "").toLowerCase();
    const summary = (result.summary ?? "").toLowerCase();
    const badKeywords = ["unable to analyze", "template", "placeholder", "n/a", "not available", "{{"];
    const looksEmpty = !result.score || result.score === 0;
    const looksTemplate = badKeywords.some((k) => title.includes(k) || summary.includes(k));
    if (looksEmpty && looksTemplate) {
      setJobError("Couldn't extract job details from this URL. Try pasting the job text directly instead.");
      return;
    }

    const count = incrementDailyCount();
    setUsedToday(count);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newJob: JobWithExtras = { ...(result as any), id };
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJobId(id);
  };

  const removeJob = (id: string) => {
    const remaining = jobs.filter((j) => j.id !== id);
    setJobs(remaining);
    if (selectedJobId === id) {
      setSelectedJobId(remaining[0]?.id ?? null);
    }
  };

  const updateJob = (id: string, patch: Partial<JobWithExtras>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const handleGenerateCover = async () => {
    if (!selectedJob || !cvText) return;
    const res = await fetch("/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText, job: selectedJob }),
    });
    const data = await res.json() as { letter?: string; error?: string };
    if (!res.ok) throw Object.assign(new Error(data.error || `Server error ${res.status}`), { status: res.status });
    if (data.letter) updateJob(selectedJob.id, { coverLetter: data.letter });
  };

  const handleTailorCV = async () => {
    if (!selectedJob || !cvText) return;
    const jobText = selectedJob.listingText || [
      selectedJob.summary,
      Array.isArray(selectedJob.matchingSkills)
        ? selectedJob.matchingSkills.join(", ")
        : selectedJob.matchingSkills,
      Array.isArray(selectedJob.missingSkills)
        ? selectedJob.missingSkills.join(", ")
        : selectedJob.missingSkills,
    ].filter(Boolean).join("\n\n");

    const res = await fetch("/api/tailor-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cvText,
        jobText,
        job: {
          matchingSkills: selectedJob.matchingSkills,
          missingSkills: selectedJob.missingSkills,
          gaps: selectedJob.gaps,
          tips: selectedJob.tips,
        },
      }),
    });
    const data = await res.json() as { tailoredCV?: string; changes?: string[]; error?: string };
    if (!res.ok) throw Object.assign(new Error(data.error || `Server error ${res.status}`), { status: res.status });
    if (data.tailoredCV)
      updateJob(selectedJob.id, { tailoredCV: data.tailoredCV, changes: data.changes ?? [] });
  };

  if (!cvText) {
    return <CVUpload onCVReady={setCvText} />;
  }

  return (
    <div className="flex flex-col bg-[#060a14] text-slate-100 h-screen overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-6 h-12 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0b1220] border border-slate-800 shadow-md shadow-slate-900/70">
            <Target className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <span className="font-semibold text-slate-50 text-base tracking-tight">
            JobMatcher
          </span>
        </div>

        <div className="flex items-center gap-3">
          {jobs.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>
                Jobs analyzed:{" "}
                <span className="text-slate-200 font-medium">{jobs.length}</span>
              </span>
              <span className="text-slate-700">|</span>
              <span>
                Best match:{" "}
                <span className="text-emerald-300 font-medium">{Math.round(topScore)}%</span>
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCvText(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition"
          >
            Upload new CV
          </button>
        </div>
      </header>

      {/* ── Body: two columns on desktop, stacked on mobile ──────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/60 lg:w-[320px] xl:w-[360px] shrink-0 max-h-[42vh] lg:max-h-none overflow-hidden">
          {/* Add Job section */}
          <div className="shrink-0 px-3 pt-3 pb-3 border-b border-slate-800/50 bg-[#060a14]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2">
              Add Job
            </p>
            <JobInput cvText={cvText} onJobAnalyzed={addJob} compact remainingAnalyses={remainingAnalyses} maxAnalyses={MAX_DAILY} />
            {jobError && (
              <p className="text-[11px] text-amber-300 mt-1">{jobError}</p>
            )}
          </div>

          {/* Job cards list — scrollable */}
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
            {jobs.length === 0 ? (
              <div className="flex items-center justify-center text-center text-slate-600 text-xs py-8 px-4">
                Add a job above to start matching
              </div>
            ) : (
              jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={job.id === selectedJobId}
                  onSelect={() => setSelectedJobId(job.id)}
                  onRemove={() => removeJob(job.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — detail panel */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          <DetailPanel
            key={selectedJob?.id ?? "empty"}
            job={selectedJob}
            cvText={cvText}
            onGenerateCover={handleGenerateCover}
            onTailorCV={handleTailorCV}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
