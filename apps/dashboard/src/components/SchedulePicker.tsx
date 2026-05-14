"use client";

import { useState } from "react";

interface Props {
  onConfirm: (scheduledAt?: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function SchedulePicker({ onConfirm, onCancel, loading }: Props) {
  const [mode, setMode] = useState<"now" | "later">("now");
  const [datetime, setDatetime] = useState("");

  // Default to 24 hours from now for convenience
  const defaultDatetime = () => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  function handleModeChange(m: "now" | "later") {
    setMode(m);
    if (m === "later" && !datetime) setDatetime(defaultDatetime());
  }

  function handleConfirm() {
    onConfirm(mode === "later" && datetime ? new Date(datetime).toISOString() : undefined);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">Approve Post</h3>

      <div className="flex gap-2">
        {(["now", "later"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {m === "now" ? "Publish immediately" : "Schedule for later"}
          </button>
        ))}
      </div>

      {mode === "later" && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Publish at</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleConfirm}
          disabled={loading || (mode === "later" && !datetime)}
          className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {loading ? "Approving…" : "Confirm Approval"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
