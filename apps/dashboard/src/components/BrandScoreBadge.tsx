import clsx from "clsx";

interface Props {
  score: number | null;
  passed: boolean | null;
}

export default function BrandScoreBadge({ score, passed }: Props) {
  if (score === null) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-400">
        Not scored
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "px-2 py-0.5 text-xs font-semibold rounded-full",
        score >= 70 ? "bg-green-900 text-green-300" :
        score >= 40 ? "bg-yellow-900 text-yellow-300" :
                      "bg-red-900 text-red-300",
      )}
    >
      {passed ? "Brand " : ""}Score: {score.toFixed(0)}
    </span>
  );
}
