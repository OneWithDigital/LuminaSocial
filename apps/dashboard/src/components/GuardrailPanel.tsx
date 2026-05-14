"use client";

import clsx from "clsx";

interface SubScores {
  tone: number;
  prohibited: number;
  structure: number;
  platform_fit: number;
  visual_style: number;
}

interface Props {
  score: number;
  passed: boolean;
  notes: string;
  subScores?: SubScores;
  revisionSuggestions?: string[];
}

const SUB_SCORE_META = [
  { key: "tone" as const,          label: "Brand Tone",      max: 25 },
  { key: "prohibited" as const,    label: "Prohibited Check", max: 25 },
  { key: "structure" as const,     label: "Caption Structure",max: 20 },
  { key: "platform_fit" as const,  label: "Platform Fit",    max: 15 },
  { key: "visual_style" as const,  label: "Visual Style",    max: 15 },
];

function ScoreBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

export default function GuardrailPanel({ score, passed, notes, subScores, revisionSuggestions }: Props) {
  return (
    <div className={clsx(
      "rounded-xl border p-5",
      passed ? "bg-green-950/30 border-green-800/50" : "bg-yellow-950/30 border-yellow-800/50",
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-200">Brand Guardrail</h2>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "text-2xl font-bold tabular-nums",
            score >= 70 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400",
          )}>
            {score.toFixed(0)}
          </span>
          <span className="text-gray-500 text-sm">/100</span>
        </div>
      </div>

      {subScores && (
        <div className="space-y-2.5 mb-4">
          {SUB_SCORE_META.map(({ key, label, max }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <ScoreBar value={subScores[key] ?? 0} max={max} />
            </div>
          ))}
        </div>
      )}

      {notes && (
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">{notes}</p>
      )}

      {revisionSuggestions && revisionSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-yellow-400 mb-2">Suggested Revisions</p>
          <ul className="space-y-1">
            {revisionSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-gray-300 flex gap-2">
                <span className="text-yellow-600 shrink-0">→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
