"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Target } from "lucide-react";
import { api } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import clsx from "clsx";

interface Suggestion {
  platform: string | null;
  headline: string;
  detail: string;
  action: string;
}

interface CoachReport {
  overall_insight: string;
  suggestions: Suggestion[];
  analyzed_posts: number;
  analyzed_lessons: number;
}

const PLATFORM_STYLE: Record<string, { bg: string; label: string }> = {
  instagram:      { bg: "from-purple-600 to-pink-600",  label: "Instagram" },
  tiktok:         { bg: "from-gray-700 to-gray-900",    label: "TikTok" },
  linkedin:       { bg: "from-blue-700 to-blue-900",    label: "LinkedIn" },
  twitter:        { bg: "from-gray-800 to-black",       label: "Twitter/X" },
  youtube_shorts: { bg: "from-red-700 to-red-900",      label: "YouTube" },
};

export default function CoachPage() {
  const [loading, setLoading]   = useState(false);
  const [report, setReport]     = useState<CoachReport | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/coach/analyze`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`API ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Coach</h1>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Claude analyzes your posts and lessons learned to give specific, actionable advice.
        </p>
      </div>

      {/* Analyze button */}
      <GlassCard glow className="flex flex-col items-center gap-4 py-8 text-center">
        {!report && !loading && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium mb-1">Ready to analyze your content</p>
              <p className="text-sm text-gray-500">
                Claude will review your recent posts, brand voice, and A/B lessons to generate personalized tips.
              </p>
            </div>
          </>
        )}

        {report && !loading && (
          <p className="text-xs text-gray-600">
            Analyzed {report.analyzed_posts} posts and {report.analyzed_lessons} lessons
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <button
          onClick={runAnalysis}
          disabled={loading}
          className={clsx(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all",
            loading
              ? "bg-gray-800 text-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-orange-900/30",
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your content…</>
          ) : report ? (
            <><RefreshCw className="w-4 h-4" /> Re-analyze</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Analyze My Content</>
          )}
        </button>
      </GlassCard>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-5 bg-white/10 rounded-full" />
                <div className="h-4 w-48 bg-white/10 rounded" />
              </div>
              <div className="h-3 bg-white/5 rounded w-full" />
              <div className="h-3 bg-white/5 rounded w-4/5" />
              <div className="h-8 bg-indigo-900/20 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {report && !loading && (
        <div className="space-y-4">
          {/* Overall insight */}
          <GlassCard className="border border-amber-700/20 bg-amber-950/10">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Overall Assessment</p>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{report.overall_insight}</p>
          </GlassCard>

          {/* Suggestions */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {report.suggestions.length} Recommendations
          </p>

          {report.suggestions.map((s, i) => {
            const ps = s.platform ? PLATFORM_STYLE[s.platform] : null;
            return (
              <GlassCard key={i} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  {ps ? (
                    <span className={clsx(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full text-white bg-gradient-to-r",
                      ps.bg,
                    )}>
                      {ps.label}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-gray-400">
                      All Platforms
                    </span>
                  )}
                  <p className="text-sm font-semibold text-white">{s.headline}</p>
                </div>

                <p className="text-sm text-gray-400 leading-relaxed">{s.detail}</p>

                <div className="bg-indigo-950/40 border border-indigo-700/30 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                    → Action
                  </p>
                  <p className="text-xs text-gray-300">{s.action}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
