import { LessonLearned } from "@/lib/api";
import clsx from "clsx";

interface Props {
  lesson: LessonLearned;
}

const STYLE_LABELS: Record<string, string> = {
  fast_aggressive: "Fast / Aggressive",
  cinematic_minimal: "Cinematic / Minimal",
};

const DELTA_COLOR = (delta: number | null) =>
  delta == null ? "text-gray-500" :
  delta > 0  ? "text-green-400" : "text-red-400";

export default function LessonsCard({ lesson }: Props) {
  const bias = lesson.recommended_bias ?? {};

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-200 leading-relaxed flex-1">{lesson.summary}</p>
        {lesson.engagement_delta != null && (
          <span className={clsx("text-sm font-semibold tabular-nums shrink-0", DELTA_COLOR(lesson.engagement_delta))}>
            {lesson.engagement_delta > 0 ? "+" : ""}
            {(lesson.engagement_delta * 100).toFixed(2)}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {lesson.winning_style && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-900/50 text-purple-300">
            {STYLE_LABELS[lesson.winning_style] ?? lesson.winning_style}
          </span>
        )}
        {lesson.winning_platform && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
            {lesson.winning_platform}
          </span>
        )}
      </div>

      {(bias.prefer_style || bias.hook_duration_sec || bias.caption_tone) && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-500 mb-2">Recommended bias for next run</p>
          <div className="flex gap-2 flex-wrap">
            {bias.prefer_style && (
              <span className="px-2 py-0.5 text-xs rounded-md bg-gray-800 text-gray-300">
                style: {STYLE_LABELS[bias.prefer_style] ?? bias.prefer_style}
              </span>
            )}
            {bias.hook_duration_sec && (
              <span className="px-2 py-0.5 text-xs rounded-md bg-gray-800 text-gray-300">
                hook: {bias.hook_duration_sec}s
              </span>
            )}
            {bias.caption_tone && (
              <span className="px-2 py-0.5 text-xs rounded-md bg-gray-800 text-gray-300">
                tone: {bias.caption_tone}
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-600">
        {new Date(lesson.created_at).toLocaleString()}
      </p>
    </div>
  );
}
