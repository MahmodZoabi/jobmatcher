"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

type CVUploadProps = {
  onCVReady: (text: string) => void;
};

const CVUpload: React.FC<CVUploadProps> = ({ onCVReady }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [manualText, setManualText] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const file = acceptedFiles[0];

      setError(null);
      setIsUploading(true);
      setExtractedText("");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/extract-cv", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as { text?: string; error?: string };

        if (!res.ok) {
          throw new Error(data.error || `Server error ${res.status}`);
        }
        if (!data.text) {
          throw new Error(data.error || "No text returned from extractor.");
        }

        setExtractedText(data.text);
        setManualText(data.text);
      } catch (err: any) {
        console.error("[CVUpload] Error extracting CV:", err);
        setError(err.message || "Unexpected error while extracting CV.");
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
  });

  const handleConfirm = () => {
    const text = manualText.trim();
    if (!text) {
      setError("Please provide your CV text first.");
      return;
    }
    onCVReady(text);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060a14] px-4">
      <div className="max-w-3xl w-full rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8 md:p-10">
        <div className="flex flex-col items-center gap-4 text-center mb-8">
          <h1
            className="text-3xl md:text-4xl font-semibold text-slate-50"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Upload your CV to get started
          </h1>
          <p className="text-slate-400 max-w-xl">
            Drag and drop a PDF or image of your CV, or paste the text directly.
            We&apos;ll extract the content securely and use it only for this
            session.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
            isDragActive
              ? "border-[#3b82f6] bg-[#0b1220]"
              : "border-slate-700 hover:border-slate-500 bg-slate-900/60"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full border border-slate-700 bg-slate-800/70 flex items-center justify-center shadow-inner">
              <span className="text-2xl text-[#3b82f6]">⬆</span>
            </div>

            <div>
              <p className="text-slate-100 font-medium">
                {isDragActive
                  ? "Drop your CV file here"
                  : "Drag & drop your CV here"}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                PDF, PNG, JPG up to 10MB
              </p>
            </div>
          </div>

          {isUploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-200">
                Extracting text from your CV...
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            or paste text
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="space-y-4">
          <textarea
            className="w-full h-48 md:h-56 resize-none rounded-2xl bg-slate-950/60 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/80 focus:border-transparent px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner"
            placeholder="Paste your CV text here..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {manualText.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            {extractedText && (
              <span className="text-emerald-400">
                Extracted from file — you can edit before continuing
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#3b82f6]/30 transition hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isUploading}
          >
            {isUploading && (
              <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
            )}
            <span>Use this CV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVUpload;

