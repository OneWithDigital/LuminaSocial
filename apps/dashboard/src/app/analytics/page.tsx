"use client";

import useSWR from "swr";
import { api, LessonLearned } from "@/lib/api";
import LessonsCard from "@/components/LessonsCard";
import clsx from "clsx";

const TIER_STYLES: Record<string, { bar: string; label: string; text: string }> = {
  Viral: { bar: "bg-purple-500", label: "Viral",  text: "text-purple-400" },
  Mid:   { bar: "bg-blue-500",   label: "Mid",    text: "text-blue-400"   },
  Low:   { bar: "bg-gray-600",   label: "Low",    text: "text-gray-400"   },
};

function TierBar({ tier, count, total }: { tier: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const style = TIER_STYLES[tier] ?? TIER_STYLES.Low;
  return (
    <div className="flex items-center gap-3">
      <span className={clsx("text-xs font-medium w-10 shrink-0", style.text)}>{style.label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{count}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: lessons, isLoading } = useSWR<LessonLearned[]>(
    "lessons",
    () => api.analytics.lessons(20),
    { refreshInterval: 60_000 },
  );

  // Tally winning styles from lessons
  const styleTally = lessons?.reduce<Record<string, number>>((acc, l) => {
    if (l.winning_style) acc[l.winning_style] = (acc[l.winning_style] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const totalLessons = lessons?.length ?? 0;

  // Compute average engagement delta
  const deltas = lessons?.map((l) => l.engagement_delta).filter((d): d is number => d != null) ?? [];
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Feedback loop insights from published A/B tests.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">Lessons Learned</p>
          <p className="text-3xl font-bold text-gray-100">{totalLessons}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">Avg Engagement Delta</p>
          <p className={clsx(
            "text-3xl font-bold",
            avgDelta == null ? "text-gray-600" :
            avgDelta > 0 ? "text-green-400" : "text-red-400",
          )}>
            {avgDelta != null ? `${avgDelta > 0 ? "+" : ""}${(avgDelta * 100).toFixed(2)}%` : "—"}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-3">Winning Styles</p>
          <div className="space-y-2">
            {[
              { key: "fast_aggressive",  label: "Fast / Aggressive" },
              { key: "cinematic_minimal", label: "Cinematic / Minimal" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-sm font-semibold text-gray-200">
                  {styleTally[key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lessons feed */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Latest Lessons
      </h2>

      {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}

      {!isLoading && totalLessons === 0 && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-sm">No lessons yet. They appear after Published posts have A/B analytics data.</p>
        </div>
      )}

      <div className="space-y-4">
        {lessons?.map((lesson) => (
          <LessonsCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
