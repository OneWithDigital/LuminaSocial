"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  postId: string;
  defaultCaption?: string | null;
  onSuccess: () => void;
}

export default function GenerateForm({ postId, defaultCaption, onSuccess }: Props) {
  const [assetPath, setAssetPath] = useState("");
  const [captionOverride, setCaptionOverride] = useState("");
  const [showCaption, setShowCaption] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.posts.generate(
        postId,
        assetPath.trim(),
        captionOverride.trim() || undefined,
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">Generate A/B Variants</h3>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">
          Source video path <span className="text-gray-600">(relative to storage/assets/ or absolute)</span>
        </label>
        <input
          type="text"
          value={assetPath}
          onChange={(e) => setAssetPath(e.target.value)}
          placeholder="source_clip.mp4"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowCaption((v) => !v)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {showCaption ? "▾ Hide caption override" : "▸ Override caption (optional)"}
        </button>
        {showCaption && (
          <textarea
            value={captionOverride}
            onChange={(e) => setCaptionOverride(e.target.value)}
            placeholder={defaultCaption ?? "Leave blank to use the post's existing caption"}
            rows={4}
            className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors resize-none"
          />
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !assetPath.trim()}
        className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generating variants…
          </>
        ) : (
          "Generate A/B Variants"
        )}
      </button>

      {loading && (
        <p className="text-xs text-gray-500 text-center">
          FFmpeg is processing both variants in parallel. This may take 30–90 seconds.
        </p>
      )}
    </form>
  );
}
