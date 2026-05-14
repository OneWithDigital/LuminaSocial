"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Platform } from "@/lib/api";

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram",      label: "Instagram Reels" },
  { value: "tiktok",         label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "twitter",        label: "Twitter / X" },
  { value: "linkedin",       label: "LinkedIn" },
];

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefillKeyword = searchParams.get("keyword") ?? "";
  const prefillTrendId = searchParams.get("trend_id") ?? "";

  const [title, setTitle] = useState(prefillKeyword ? `Post about: ${prefillKeyword}` : "");
  const [prompt, setPrompt] = useState(prefillKeyword ? `Create engaging content about: ${prefillKeyword}` : "");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const post = await api.posts.create({
        title: title.trim(),
        raw_prompt: prompt.trim(),
        caption_draft: caption.trim() || undefined,
        platform_target: platform,
        trend_id: prefillTrendId || undefined,
      });
      router.push(`/posts/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-100">New Post</h1>
        {prefillKeyword && (
          <p className="text-sm text-purple-400 mt-1">Pre-filled from trend: {prefillKeyword}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer campaign launch"
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Generation prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the content, tone, and message for the video factory…"
            required
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Caption draft <span className="text-gray-600">(optional — can be added later)</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Hook line&#10;&#10;Body copy…&#10;&#10;CTA #hashtags"
            rows={5}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Target platform</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlatform(p.value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                  platform === p.value
                    ? "bg-purple-600/20 border-purple-600 text-purple-300"
                    : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {loading ? "Creating…" : "Create Post"}
        </button>
      </form>
    </div>
  );
}
