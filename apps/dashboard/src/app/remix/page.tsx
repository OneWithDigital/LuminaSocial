"use client";

import { useState } from "react";
import { Wand2, Link as LinkIcon, Lightbulb, Loader2, RotateCcw, BookmarkPlus } from "lucide-react";
import { api, PlatformDraft, RemixBundle } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import PlatformDraftCard from "@/components/PlatformDraftCard";
import clsx from "clsx";

const ALL_PLATFORMS = [
  { key: "facebook",       label: "Facebook",  initials: "f"  },
  { key: "instagram",      label: "Instagram", initials: "IG" },
  { key: "tiktok",         label: "TikTok",    initials: "TK" },
  { key: "linkedin",       label: "LinkedIn",  initials: "in" },
  { key: "twitter",        label: "Twitter/X", initials: "𝕏"  },
  { key: "youtube_shorts", label: "YouTube",   initials: "YT" },
];

export default function RemixPage() {
  const [inputType, setInputType]       = useState<"text" | "url">("text");
  const [content, setContent]           = useState("");
  const [platforms, setPlatforms]       = useState<string[]>(ALL_PLATFORMS.map((p) => p.key));
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [bundle, setBundle]             = useState<RemixBundle | null>(null);
  const [drafts, setDrafts]             = useState<PlatformDraft[]>([]);
  const [saving, setSaving]             = useState(false);
  const [savedCount, setSavedCount]     = useState(0);

  function togglePlatform(key: string) {
    setPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function updateDraftBody(platform: string, value: string) {
    setDrafts((prev) =>
      prev.map((d) => d.platform === platform ? { ...d, body: value } : d)
    );
  }

  async function handleRemix() {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    setBundle(null);
    setSavedCount(0);
    try {
      const result = await api.remix.generate({ input_type: inputType, content, platforms });
      setBundle(result);
      setDrafts(result.drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDrafts() {
    if (!drafts.length) return;
    setSaving(true);
    let count = 0;
    for (const draft of drafts) {
      try {
        const caption = [draft.body, ...draft.hashtags.map((h) => `#${h.replace(/^#/, "")}`)].join(" ");
        await api.posts.create({
          title: draft.body.slice(0, 60) + (draft.body.length > 60 ? "…" : ""),
          raw_prompt: content,
          platform_target: draft.platform as any,
          caption_draft: caption,
        });
        count++;
      } catch {
        // continue saving others if one fails
      }
    }
    setSavedCount(count);
    setSaving(false);
  }

  function handleReset() {
    setBundle(null);
    setDrafts([]);
    setContent("");
    setSavedCount(0);
    setError(null);
  }

  const hasResults = bundle && drafts.length > 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Wand2 className="w-3.5 h-3.5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Content Remixer</h1>
        </div>
        <p className="text-sm text-gray-500 ml-9">
          Turn any idea or URL into ready-to-post drafts for every platform — instantly.
        </p>
      </div>

      {/* Input section */}
      {!hasResults && (
        <GlassCard glow className="space-y-5">
          {/* Input type tabs */}
          <div className="flex items-center gap-1 bg-black/30 rounded-xl p-1 w-fit">
            <button
              onClick={() => setInputType("text")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                inputType === "text"
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Idea / Text
            </button>
            <button
              onClick={() => setInputType("url")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                inputType === "url"
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              URL
            </button>
          </div>

          {/* Content input */}
          {inputType === "text" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your idea, topic, or paste any content you want to remix into posts…"
              rows={5}
              className="w-full bg-black/20 border border-white/10 focus:border-purple-600/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none transition-colors leading-relaxed"
            />
          ) : (
            <input
              type="url"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="https://yourblog.com/article  or  https://youtube.com/watch?v=..."
              className="w-full bg-black/20 border border-white/10 focus:border-purple-600/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none transition-colors"
            />
          )}

          {/* Platform toggles */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2.5">Generate for:</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map((p) => {
                const active = platforms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                      active
                        ? "bg-purple-600/20 text-purple-300 border-purple-600/50"
                        : "bg-white/5 text-gray-600 border-white/10 hover:text-gray-400"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Generate button */}
          <button
            onClick={handleRemix}
            disabled={loading || !content.trim() || platforms.length === 0}
            className={clsx(
              "w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              loading || !content.trim() || platforms.length === 0
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-purple-900/30"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Remixing {platforms.length} platforms…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Remix Content
              </>
            )}
          </button>
        </GlassCard>
      )}

      {/* Skeleton loading cards */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <div key={p} className="glass-card p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10" />
                <div className="h-3 w-20 bg-white/10 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded w-full" />
                <div className="h-2 bg-white/10 rounded w-5/6" />
                <div className="h-2 bg-white/10 rounded w-4/6" />
                <div className="h-2 bg-white/10 rounded w-full" />
                <div className="h-2 bg-white/10 rounded w-3/4" />
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-5 w-14 bg-white/5 rounded-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-5">
          {/* Source summary + action bar */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Source</p>
              <p className="text-sm text-gray-300">{bundle.source_summary}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedCount > 0 && (
                <span className="text-xs text-green-400 bg-green-900/30 border border-green-700/30 px-3 py-1.5 rounded-xl">
                  ✓ {savedCount} draft{savedCount !== 1 ? "s" : ""} saved
                </span>
              )}
              <button
                onClick={handleSaveDrafts}
                disabled={saving || savedCount > 0}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                  saving || savedCount > 0
                    ? "border-white/10 text-gray-600 cursor-not-allowed"
                    : "border-purple-700/50 text-purple-300 hover:bg-purple-900/20"
                )}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save All as Drafts"}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Remix Again
              </button>
            </div>
          </div>

          {/* Platform cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map((draft) => (
              <PlatformDraftCard
                key={draft.platform}
                draft={draft}
                onBodyChange={(val) => updateDraftBody(draft.platform, val)}
              />
            ))}
          </div>

          {/* Save reminder */}
          {savedCount === 0 && (
            <p className="text-xs text-gray-600 text-center">
              Edit any post above, then save to your queue — or copy each one directly to post manually.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
