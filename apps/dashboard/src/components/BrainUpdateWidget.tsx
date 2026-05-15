"use client";

import useSWR from "swr";
import { api, LessonLearned } from "@/lib/api";
import GlassCard from "./GlassCard";

export default function BrainUpdateWidget() {
  const { data: lessons } = useSWR<LessonLearned[]>(
    "brain-lessons",
    () => api.analytics.lessons(3),
    { refreshInterval: 30_000 },
  );

  const latest = lessons?.[0];

  return (
    <GlassCard glow className="flex flex-col h-full min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest">Brain Update</p>
      </div>

      {!latest ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-600 text-center">
            The AI will post updates here after your first published A/B test.
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3">
          <p className="text-sm text-gray-200 leading-relaxed">{latest.summary}</p>

          <div className="flex flex-wrap gap-2 mt-2">
            {latest.winning_style && (
              <span className="text-[10px] bg-purple-900/40 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full">
                ✦ {latest.winning_style.replace("_", " ")}
              </span>
            )}
            {latest.winning_platform && (
              <span className="text-[10px] bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded-full">
                {latest.winning_platform}
              </span>
            )}
            {latest.engagement_delta != null && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                latest.engagement_delta > 0
                  ? "bg-green-900/40 border-green-700/50 text-green-300"
                  : "bg-red-900/40 border-red-700/50 text-red-300"
              }`}>
                {latest.engagement_delta > 0 ? "+" : ""}
                {(latest.engagement_delta * 100).toFixed(1)}% engagement
              </span>
            )}
          </div>

          {lessons && lessons.length > 1 && (
            <p className="text-[10px] text-gray-600 mt-2">
              +{lessons.length - 1} more lesson{lessons.length > 2 ? "s" : ""} learned
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
