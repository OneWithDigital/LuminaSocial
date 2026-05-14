import clsx from "clsx";

interface Props {
  score: number | null;
  passed: boolean | null;
  size?: "sm" | "lg";
}

export default function BrandScoreBadge({ score, passed, size = "sm" }: Props) {
  if (score === null) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-500">
        Not scored
      </span>
    );
  }

  const color =
    score >= 70 ? "bg-green-900/60 text-green-300 ring-green-700" :
    score >= 40 ? "bg-yellow-900/60 text-yellow-300 ring-yellow-700" :
                  "bg-red-900/60 text-red-300 ring-red-700";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 font-semibold rounded-full ring-1",
        color,
        size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
      )}
    >
      <span
        className={clsx(
          "w-1.5 h-1.5 rounded-full",
          score >= 70 ? "bg-green-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400",
        )}
      />
      Brand {score.toFixed(0)}/100
    </span>
  );
}
