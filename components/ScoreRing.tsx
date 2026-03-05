"use client";

import React, { useEffect, useState } from "react";

type ScoreRingProps = {
  score: number;
  size?: number;
};

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 120 }) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Adaptive stroke width: thinner for small rings
  const strokeWidth = size < 60 ? 5 : size < 100 ? 8 : 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const clampedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (clampedScore / 100) * circumference;

  let color = "#ef4444";
  if (clampedScore >= 75) color = "#22c55e";
  else if (clampedScore >= 50) color = "#f59e0b";

  useEffect(() => {
    let frame: number;
    const duration = 600;
    const start = performance.now();
    const startValue = displayScore;
    const delta = clampedScore - startValue;

    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startValue + delta * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clampedScore]);

  // Inner usable diameter for text
  const innerDiameter = size - strokeWidth * 2 - 4;

  // Tiny mode (< 64px): just the number, no label, no %
  if (size < 64) {
    const fontSize = Math.max(10, Math.floor(innerDiameter * 0.38));
    return (
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1f2933"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold text-slate-50 leading-none tabular-nums"
            style={{ fontSize }}
          >
            {displayScore}
          </span>
        </div>
      </div>
    );
  }

  // Medium mode (64–99px): number + %
  if (size < 100) {
    const fontSize = Math.max(14, Math.floor(innerDiameter * 0.32));
    const pctSize = Math.max(9, Math.floor(fontSize * 0.55));
    return (
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1f2933"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold text-slate-50 leading-none tabular-nums" style={{ fontSize }}>
            {displayScore}
            <span className="text-slate-400 font-normal" style={{ fontSize: pctSize }}>%</span>
          </span>
        </div>
      </div>
    );
  }

  // Large mode (100px+): Match label + number + %
  const fontSize = Math.max(18, Math.floor(innerDiameter * 0.28));
  const pctSize = Math.max(11, Math.floor(fontSize * 0.55));
  const labelSize = Math.max(9, Math.floor(fontSize * 0.42));

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1f2933"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="uppercase tracking-wider text-slate-400 leading-none"
          style={{ fontSize: labelSize }}
        >
          Match
        </span>
        <span className="font-bold text-slate-50 leading-none tabular-nums" style={{ fontSize }}>
          {displayScore}
          <span className="text-slate-400 font-normal" style={{ fontSize: pctSize }}>%</span>
        </span>
      </div>
    </div>
  );
};

export default ScoreRing;
