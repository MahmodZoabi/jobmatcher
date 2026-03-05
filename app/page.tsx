import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  FileScan,
  FileText,
  Link2,
  PenTool,
  Target,
  UploadCloud,
  Github,
  Linkedin,
} from "lucide-react";

export const metadata: Metadata = {
  title: "JobMatcher – AI-Powered Job Match Scoring",
  description:
    "Stop guessing and know your match. Upload your CV, paste any job listing, and get a transparent match score, tailored CV, and cover letter in minutes.",
  openGraph: {
    title: "JobMatcher – Stop guessing. Know your match.",
    description:
      "AI-powered job matching that tells you exactly where you stand with any job listing.",
    url: "https://jobmatcher.app",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "JobMatcher – AI-Powered Job Matching Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobMatcher – Stop guessing. Know your match.",
    description:
      "AI-powered job matching that tells you exactly where you stand with any job listing.",
    images: ["/og.png"],
  },
};

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060a14] text-slate-100">
      <div className="gradient-mesh" />
      <div className="grid-overlay" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        {/* Navbar */}
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1220] border border-slate-800 shadow-md shadow-slate-900/70">
              <Target className="h-5 w-5 text-[#3b82f6]" />
            </div>
            <div>
              <p
                className="text-sm font-semibold tracking-tight text-slate-50"
                style={{ fontFamily: "var(--font-display)" }}
              >
                JobMatcher
              </p>
              <p className="text-[11px] text-slate-400">
                AI job match assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/in/mahmod-zoabi/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-200 hover:border-[#3b82f6] hover:text-white hover:bg-slate-900/90 transition"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6]/10 text-[#3b82f6]">
                <Linkedin className="h-3 w-3" />
              </span>
              <span>Built by Mahmod Zoabi</span>
            </a>

            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#3b82f6] px-4 py-1.5 text-xs font-medium text-white shadow-md shadow-[#3b82f6]/40 hover:bg-[#2563eb] transition"
            >
              <span>Try it free</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <main className="mt-6 flex flex-1 flex-col gap-12 lg:mt-10">
          <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-300 shadow-sm shadow-slate-900/60">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <span>Built for students, job switchers & power applicants</span>
              </div>

              <div className="space-y-4">
                <h1
                  className="text-3xl leading-tight text-slate-50 sm:text-4xl md:text-5xl md:leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Stop guessing.{" "}
                  <span className="bg-gradient-to-r from-[#3b82f6] via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                    Know your match.
                  </span>
                </h1>
                <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                  JobMatcher reads any job listing, compares it to your CV, and
                  tells you exactly where you stand — with a transparent score,
                  gap analysis, and ready-to-send cover letter.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#3b82f6]/40 hover:bg-[#2563eb] transition"
                >
                  <span>Try it free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-xs text-slate-400">
                  No signup. Paste your CV, paste a job, get your score.
                </p>
              </div>

              <dl className="flex flex-wrap gap-6 text-xs text-slate-400">
                <div>
                  <dt className="font-semibold text-slate-200">
                    Claude + Gemini under the hood
                  </dt>
                  <dd>Best-in-class AI for reliable, transparent scoring.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-200">
                    Works with any job link
                  </dt>
                  <dd>Paste LinkedIn, company careers pages, and more.</dd>
                </div>
              </dl>
            </div>

            {/* Hero mockup */}
            <div className="relative">
              <div className="hero-glow" />
              <div className="relative rounded-3xl border border-slate-800/90 bg-slate-950/70 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700/80">
                      <Target className="h-4 w-4 text-[#3b82f6]" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">
                      Match overview
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                    87% match
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] gap-3">
                  <div className="space-y-3 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Senior Product Analyst
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Notion • Tel Aviv (Hybrid)
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <p>Required skills</p>
                        <p className="text-emerald-300 font-medium">
                          11 / 13 matched
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
                        <p className="text-slate-400 mb-1">Experience</p>
                        <p className="text-slate-100 font-semibold">22 / 25</p>
                        <p className="text-[10px] text-emerald-300">
                          Direct SaaS analytics experience
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2">
                        <p className="text-slate-400 mb-1">Education</p>
                        <p className="text-slate-100 font-semibold">14 / 15</p>
                        <p className="text-[10px] text-slate-300">
                          BSc Industrial Engineering
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["SQL", "Product analytics", "Experimentation", "Stakeholder comms"].map(
                        (tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]"
                          >
                            {tag}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Actions</span>
                      <span className="text-xs text-slate-300">
                        2 mins to ready
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium">
                            Tailored CV
                          </span>
                          <PenTool className="h-3 w-3 text-sky-400" />
                        </div>
                        <p className="text-slate-400">
                          Reordered and rewritten for this job.
                        </p>
                        <span className="mt-1 text-sky-300">
                          View changes →
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium">
                            Cover letter
                          </span>
                          <FileText className="h-3 w-3 text-emerald-400" />
                        </div>
                        <p className="text-slate-400">
                          220-word draft tailored to this role.
                        </p>
                        <span className="mt-1 text-emerald-300">
                          Copy & send →
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Powered by Claude Sonnet & Gemini</span>
                      <span className="text-slate-500">
                        Your CV is never stored.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
                How it works
              </p>
              <h2
                className="text-xl sm:text-2xl font-semibold text-slate-50"
                style={{ fontFamily: "var(--font-display)" }}
              >
                From CV to confident application in three steps
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Upload your CV",
                  icon: <UploadCloud className="h-5 w-5" />,
                  description:
                    "Drag and drop a PDF or image, or paste your CV text. JobMatcher extracts everything for you.",
                },
                {
                  step: "02",
                  title: "Paste a job listing",
                  icon: <Link2 className="h-5 w-5" />,
                  description:
                    "Paste the full description or a link from LinkedIn, company sites, or job boards.",
                },
                {
                  step: "03",
                  title: "See your match",
                  icon: <FileScan className="h-5 w-5" />,
                  description:
                    "Get a score, breakdown, tailored CV, and cover letter that speaks the job’s language.",
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-sm shadow-slate-950/50 animate-fade-up"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-[#3b82f6]/15 via-transparent to-emerald-400/10" />
                  <div className="relative flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono text-slate-500">
                      {item.step}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1220] border border-slate-700/80 text-sky-300">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="relative text-sm font-semibold text-slate-50 mb-1.5">
                    {item.title}
                  </h3>
                  <p className="relative text-xs text-slate-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3b82f6]">
                Features
              </p>
              <h2
                className="text-xl sm:text-2xl font-semibold text-slate-50"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Everything you need to apply with confidence
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Match scoring with rubric breakdown",
                  icon: <Target className="h-5 w-5" />,
                  description:
                    "See exactly how you score across skills, experience, education, seniority, and nice-to-haves.",
                },
                {
                  title: "URL scraping that reads any job page",
                  icon: <Link2 className="h-5 w-5" />,
                  description:
                    "Paste a link from LinkedIn or any careers page. JobMatcher extracts just the job content.",
                },
                {
                  title: "Gap analysis you can act on",
                  icon: <FileScan className="h-5 w-5" />,
                  description:
                    "Understand what you’re missing and which gaps are most important before you apply.",
                },
                {
                  title: "CV tailoring that stays honest",
                  icon: <PenTool className="h-5 w-5" />,
                  description:
                    "Your CV is rewritten and reordered around the job — without inventing skills or experience.",
                },
                {
                  title: "Cover letters that sound like you",
                  icon: <FileText className="h-5 w-5" />,
                  description:
                    "Get a tight, under-250-word cover letter that mirrors the job’s language and your real profile.",
                },
                {
                  title: "Privacy-first by design",
                  icon: <CheckCircle2 className="h-5 w-5" />,
                  description:
                    "CVs and job listings are processed on the fly. No accounts, no tracking, no long-term storage.",
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm shadow-slate-950/60 animate-fade-up"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1220] border border-slate-700/80 text-[#3b82f6]">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-50">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA section */}
          <section className="mt-2 rounded-3xl border border-slate-800 bg-gradient-to-r from-[#0b1220] via-[#020617] to-[#0f172a] p-5 sm:p-6 lg:p-8 shadow-2xl shadow-black/60">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2
                  className="text-xl sm:text-2xl font-semibold text-slate-50"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to see your match?
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Upload your CV and paste a job link. In under two minutes,
                  you&apos;ll know exactly how strong your application really
                  is.
                </p>
                <p className="text-[11px] text-slate-400">
                  No signup required. Your data stays private.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#3b82f6]/40 hover:bg-[#2563eb] transition"
                >
                  <span>Get started — it&apos;s free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-800/80 pt-4 text-xs text-slate-400 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-slate-300">
              Built by{" "}
              <a
                href="https://www.linkedin.com/in/mahmod-zoabi/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-slate-100 hover:text-[#3b82f6] transition"
              >
                Mahmod Zoabi
              </a>
            </p>
            <p className="text-[11px] text-slate-500">
              Industrial Engineering Student @ Tel Aviv University
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/mahmod-zoabi/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#3b82f6] transition"
            >
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn</span>
            </a>
            <a
              href="https://github.com/MahmodZoabi"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>

          <p className="text-[11px] text-slate-500 sm:text-right">
            © 2026 JobMatcher
          </p>
        </footer>
      </div>
    </div>
  );
}
