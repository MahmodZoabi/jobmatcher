"use client";

import React from "react";
import ScoreRing from "./ScoreRing";
import type { AnalysisResult } from "./JobInput";

type JobWithMeta = AnalysisResult & {
  id: string;
};

type JobCardProps = {
  job: JobWithMeta;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
};

const priorityConfig: Record<number, { label: string; color: string; bg: string }> = {
  1: {
    label: "Top Priority",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/40",
  },
  2: {
    label: "Worth Applying",
    color: "text-yellow-300",
    bg: "bg-yellow-500/10 border-yellow-500/40",
  },
  3: {
    label: "Long Shot",
    color: "text-orange-300",
    bg: "bg-orange-500/10 border-orange-500/40",
  },
  4: {
    label: "Weak Match",
    color: "text-red-300",
    bg: "bg-red-500/10 border-red-500/40",
  },
};

const JobCard: React.FC<JobCardProps> = ({ job, isSelected, onSelect, onRemove }) => {
  const score = Math.round(job.score ?? 0);
  const priority = job.priority ?? 4;
  const config = priorityConfig[priority] ?? priorityConfig[4];

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
        isSelected
          ? "border-[#3b82f6] bg-[#3b82f6]/5 shadow-md shadow-[#3b82f6]/10"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60"
      }`}
      onClick={onSelect}
    >
      <ScoreRing score={score} size={52} />

      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-slate-100 truncate leading-tight">
          {job.title || "Untitled role"}
        </p>
        <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
          {job.company || "Unknown company"}
        </p>
        <span
          className={`inline-flex items-center mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold border ${config.bg} ${config.color}`}
        >
          {config.label}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded-full text-slate-500 hover:text-red-300 hover:bg-red-950/60 transition text-xs border border-transparent hover:border-red-800/50"
        aria-label="Remove job"
      >
        ✕
      </button>
    </div>
  );
};

export type { JobWithMeta };
export default JobCard;
