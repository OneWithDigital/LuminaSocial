"use client";

import useSWR from "swr";
import { api, LessonLearned } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import Sparkline from "@/components/Sparkline";
import LessonsCard from "@/components/LessonsCard";
import clsx from "clsx";

function insightText(deltas: number[]): string {
  if (deltas.length < 2) return "Not enough data yet — publish more A/B tests to see trends.";
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const recent = deltas.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, deltas.length);
  const trend = recent > avg + 0.02 ? "↑ Trending up" : recent < avg - 0.02 ? "↓ Trending down" : "→ Holding steady";
  return `${trend} — avg ${avg > 0 ? "+" : ""}${(avg * 100).toFixed(1)}% engagement across ${deltas.length} tests.`;
}

function styleInsightText(tally: Record<string, number>): string {
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return "No winning styles identified yet.";
  const [top] = sorted;
  return `"${top[0].replace(/_/g, " ")}" is your strongest content style with ${top[1]} win${top[1] !== 1 ? "s" : ""}.`;
}

export default function AnalyticsPage() {
  const { data: lessons, isLoading } = useSWR<LessonLearned[]>(
    "lessons",
    () => api.analytics.lessons(20),
    { refreshInterval: 60_000 },
  );

  const styleTally = lessons?.reduce<Record<string, number>>((acc, l) => {
    if (l.winning_style) acc[l.winning_style] = (acc[l.winning_style] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const totalLessons = lessons?.length ?? 0;
  const deltas = lessons?.map((l) => l.engagement_delta).filter((d): d is number => d != null) ?? [];
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;

  const styleEntries = Object.entries(styleTally).sort((a, b) => b[1] - a[1]);
  const maxStyle = styleEntries[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Feedback loop insights from published A/B tests.</p>
      </div>

      {/* Stat cards row */}
      <div className="bento-grid">
        {/* Lessons Learned */}
        <GlassCard className="flex flex-col gap-2">
          <p className="text-xs text-gray-500">Lessons Learned</p>
          <p className="text-3xl font-bold text-purple-400">{totalLessons}</p>
          <p className="text-[11px] text-gray-600">from A/B tests</p>
        </GlassCard>

        {/* Avg Engagement Delta + Sparkline */}
        <GlassCard className="bento-span-2 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500">Avg Engagement Delta</p>
              <p className={clsx(
                "text-3xl font-bold mt-1",
                avgDelta == null ? "text-gray-600" : avgDelta > 0 ? "text-green-400" : "text-red-400",
              )}>
                {avgDelta != null ? `${avgDelta > 0 ? "+" : ""}${(avgDelta * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
            <div className="w-32">
              {deltas.length > 1 && <Sparkline data={deltas.map((d) => d * 100)} color="#22c55e" height={48} />}
            </div>
          </div>
          {/* AI Insight */}
          <div className="bg-purple-950/40 border border-purple-700/30 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5">✦ AI Insight</p>
            <p className="text-xs text-gray-300">{insightText(deltas)}</p>
          </div>
        </GlassCard>

        {/* Winning Styles */}
        <GlassCard className="flex flex-col gap-3">
          <p className="text-xs text-gray-500">Winning Styles</p>
          {styleEntries.length === 0 ? (
            <p className="text-xs text-gray-600 flex-1 flex items-center">No data yet.</p>
          ) : (
            <div className="space-y-2 flex-1">
              {styleEntries.slice(0, 4).map(([style, count]) => (
                <div key={style} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 w-28 shrink-0 truncate">{style.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(count / maxStyle) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-500 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="bg-blue-950/40 border border-blue-700/30 rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">✦ AI Insight</p>
            <p className="text-xs text-gray-300">{styleInsightText(styleTally)}</p>
          </div>
        </GlassCard>
      </div>

      {/* Lessons feed */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Latest Lessons</p>

        {isLoading && (
          <div className="text-center py-10 text-gray-600 text-sm">Loading…</div>
        )}

        {!isLoading && totalLessons === 0 && (
          <GlassCard className="text-center py-10">
            <p className="text-sm text-gray-600">
              No lessons yet. They appear after published posts have A/B analytics data.
            </p>
          </GlassCard>
        )}

        <div className="space-y-3">
          {lessons?.map((lesson) => (
            <LessonsCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </div>
    </div>
  );
}
