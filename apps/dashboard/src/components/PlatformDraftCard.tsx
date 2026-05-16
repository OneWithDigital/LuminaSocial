"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { PlatformDraft } from "@/lib/api";
import clsx from "clsx";

const PLATFORM_STYLE: Record<string, { bg: string; initials: string }> = {
  instagram:      { bg: "from-purple-600 to-pink-600",  initials: "IG" },
  tiktok:         { bg: "from-gray-800 to-gray-900",    initials: "TK" },
  linkedin:       { bg: "from-blue-700 to-blue-900",    initials: "in" },
  twitter:        { bg: "from-gray-900 to-black",       initials: "𝕏"  },
  youtube_shorts: { bg: "from-red-700 to-red-900",      initials: "YT" },
};

interface Props {
  draft: PlatformDraft;
  onBodyChange: (value: string) => void;
}

export default function PlatformDraftCard({ draft, onBodyChange }: Props) {
  const [copied, setCopied] = useState(false);
  const style = PLATFORM_STYLE[draft.platform] ?? { bg: "from-gray-700 to-gray-800", initials: "?" };

  const fullText = [draft.body, ...draft.hashtags.map((h) => `#${h.replace(/^#/, "")}`)].join(" ");
  const charCount = fullText.length;
  const pct = charCount / draft.char_limit;

  const counterColor =
    pct > 0.95 ? "text-red-400" :
    pct > 0.8  ? "text-amber-400" :
    "text-gray-600";

  async function handleCopy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="glass-card flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={clsx(
          "w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0",
          style.bg,
        )}>
          {style.initials}
        </div>
        <p className="text-sm font-semibold text-gray-200">{draft.platform_name}</p>
        <button
          onClick={handleCopy}
          title="Copy post"
          className={clsx(
            "ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all",
            copied
              ? "bg-green-900/40 text-green-400 border border-green-700/40"
              : "bg-white/5 text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20"
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Editable body */}
      <textarea
        value={draft.body}
        onChange={(e) => onBodyChange(e.target.value)}
        rows={draft.platform === "twitter" ? 3 : 5}
        className="w-full bg-black/20 border border-white/5 focus:border-purple-600/50 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-700 resize-none focus:outline-none transition-colors leading-relaxed"
      />

      {/* Hashtags */}
      {draft.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-purple-900/30 border border-purple-700/30 text-purple-400 px-2 py-0.5 rounded-full"
            >
              #{tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}

      {/* Char counter */}
      <div className="flex items-center justify-between">
        <span className={clsx("text-[11px] tabular-nums", counterColor)}>
          {charCount} / {draft.char_limit}
        </span>
        {pct > 0.95 && (
          <span className="text-[11px] text-red-400">Over limit</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden -mt-1">
        <div
          className={clsx("h-full rounded-full transition-all", pct > 0.95 ? "bg-red-500" : pct > 0.8 ? "bg-amber-400" : "bg-purple-500")}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
