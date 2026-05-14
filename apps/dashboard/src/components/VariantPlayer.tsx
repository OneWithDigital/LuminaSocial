import { videoUrl, AnalyticsRow } from "@/lib/api";
import clsx from "clsx";

interface Props {
  variant: "A" | "B";
  path: string | null;
  durationSec: number | null;
  isWinner: boolean;
  analytics: AnalyticsRow | null;
}

const STYLE_LABEL: Record<"A" | "B", string> = {
  A: "Fast / Aggressive",
  B: "Cinematic / Minimal",
};

const TIER_COLORS: Record<string, string> = {
  Viral: "bg-purple-900/60 text-purple-300",
  Mid:   "bg-blue-900/60 text-blue-300",
  Low:   "bg-gray-800 text-gray-400",
};

export default function VariantPlayer({ variant, path, durationSec, isWinner, analytics }: Props) {
  return (
    <div className={clsx(
      "rounded-xl border p-4 flex flex-col gap-3",
      isWinner ? "bg-gray-900 border-purple-700" : "bg-gray-900 border-gray-800",
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx(
            "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center",
            variant === "A" ? "bg-orange-800 text-orange-200" : "bg-indigo-800 text-indigo-200",
          )}>
            {variant}
          </span>
          <span className="text-xs text-gray-400">{STYLE_LABEL[variant]}</span>
        </div>
        <div className="flex items-center gap-2">
          {durationSec != null && (
            <span className="text-xs text-gray-500">{durationSec.toFixed(1)}s</span>
          )}
          {isWinner && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-medium">
              Winner
            </span>
          )}
        </div>
      </div>

      {path ? (
        <video
          src={videoUrl(path)}
          controls
          playsInline
          className="w-full rounded-lg bg-black aspect-[9/16] object-contain"
        />
      ) : (
        <div className="w-full aspect-[9/16] bg-gray-800/50 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-xs">Not generated yet</span>
        </div>
      )}

      {analytics && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Views",  value: analytics.views.toLocaleString() },
            { label: "Likes",  value: analytics.likes.toLocaleString() },
            { label: "Shares", value: analytics.shares.toLocaleString() },
            { label: "Eng%",   value: `${(analytics.engagement_rate * 100).toFixed(2)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800/60 rounded-lg py-1.5">
              <div className="text-[10px] text-gray-500">{label}</div>
              <div className="text-xs font-semibold text-gray-200">{value}</div>
            </div>
          ))}
          {analytics.performance_tier && (
            <div className={clsx(
              "col-span-4 text-center py-1 rounded-lg text-xs font-medium",
              TIER_COLORS[analytics.performance_tier] ?? TIER_COLORS.Low,
            )}>
              {analytics.performance_tier} performer
            </div>
          )}
        </div>
      )}
    </div>
  );
}
