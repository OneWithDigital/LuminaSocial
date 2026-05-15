import GlassCard from "./GlassCard";
import clsx from "clsx";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "purple" | "green" | "blue" | "amber";
  icon?: string;
}

const ACCENT = {
  purple: "text-purple-400",
  green:  "text-green-400",
  blue:   "text-blue-400",
  amber:  "text-amber-400",
};

export default function StatCard({ label, value, sub, accent = "purple", icon }: Props) {
  return (
    <GlassCard className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={clsx("text-3xl font-bold", ACCENT[accent])}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600">{sub}</p>}
    </GlassCard>
  );
}
