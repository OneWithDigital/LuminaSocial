"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = "#a855f7", height = 48 }: Props) {
  const chartData = data.map((v, i) => ({ i, v }));
  const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <ReferenceLine y={avg} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="bg-gray-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200">
                {Number(payload[0].value).toLocaleString()}
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
