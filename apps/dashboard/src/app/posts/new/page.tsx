"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, Platform } from "@/lib/api";
import clsx from "clsx";

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: "instagram",      label: "Instagram Reels", icon: "📷" },
  { value: "tiktok",         label: "TikTok",          icon: "🎵" },
  { value: "youtube_shorts", label: "YouTube Shorts",  icon: "▶️" },
  { value: "twitter",        label: "Twitter / X",     icon: "𝕏" },
  { value: "linkedin",       label: "LinkedIn",        icon: "💼" },
];

type Step = "idea" | "draft" | "schedule";

export default function NewPostPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const prefillKeyword = searchParams.get("keyword") ?? "";
  const prefillTrendId = searchParams.get("trend_id") ?? "";

  const [step, setStep]         = useState<Step>("idea");
  const [platform, setPlatform] = useState<Platform>("instagram");

  // Idea step
  const [ideas, setIdeas]       = useState(prefillKeyword ? `Content about: ${prefillKeyword}` : "");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  // Draft step (AI-generated, editable)
  const [title, setTitle]     = useState("");
  const [hook, setHook]       = useState("");
  const [body, setBody]       = useState("");
  const [caption, setCaption] = useState("");

  // Schedule step
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Step 1 → 2: generate AI draft ─────────────────────────────
  async function handleGenerateDraft() {
    if (!ideas.trim()) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const profile = await api.profile.get().catch(() => null);
      const draft = await api.profile.aiDraft({
        ideas: ideas.trim(),
        platform,
        brand_voice: profile?.brand_voice ?? undefined,
      });
      setTitle(draft.title);
      setHook(draft.hook);
      setBody(draft.body);
      setCaption(draft.caption);
      setStep("draft");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "AI draft failed. Fill in manually below.");
      // Still advance to draft step so user can type manually
      setTitle(prefillKeyword ? `Post about: ${prefillKeyword}` : "");
      setStep("draft");
    } finally {
      setDrafting(false);
    }
  }

  // ── Step 2 → 3 ────────────────────────────────────────────────
  function handleDraftNext() {
    if (!title.trim() || !caption.trim()) return;
    setStep("schedule");
  }

  // ── Step 3: create post ───────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    let scheduledAt: string | undefined;
    if (scheduleMode === "later" && scheduleDate) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    }

    try {
      const fullPrompt = [hook, body].filter(Boolean).join("\n\n");
      const post = await api.posts.create({
        title:           title.trim(),
        raw_prompt:      fullPrompt || ideas.trim(),
        caption_draft:   caption.trim() || undefined,
        platform_target: platform,
        trend_id:        prefillTrendId || undefined,
      });

      // If scheduled for later, immediately approve with the scheduled time
      if (scheduledAt) {
        await api.posts.approve(post.id, "user", scheduledAt);
      }

      router.push(`/posts/${post.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create post");
      setSubmitting(false);
    }
  }

  // ── Progress indicator ────────────────────────────────────────
  const steps: { key: Step; label: string }[] = [
    { key: "idea",     label: "1. Your Idea" },
    { key: "draft",    label: "2. Draft" },
    { key: "schedule", label: "3. Schedule" },
  ];

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      <h1 className="text-xl font-bold text-gray-100 mb-6">New Post</h1>

      {/* Step pills */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map(({ key, label }, i) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={clsx(
                "text-xs font-medium px-3 py-1 rounded-full border transition-colors",
                step === key
                  ? "bg-purple-600/20 border-purple-600 text-purple-300"
                  : steps.findIndex((s) => s.key === step) > i
                  ? "bg-gray-800 border-gray-700 text-gray-400 line-through"
                  : "bg-transparent border-gray-800 text-gray-600"
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="text-gray-700">›</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Idea ─────────────────────────────────────────── */}
      {step === "idea" && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                What's your idea or topic?
              </label>
              <textarea
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                placeholder="e.g. 3 morning habits that doubled my productivity — keep it short, punchy, relatable for busy entrepreneurs"
                rows={5}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none"
              />
              <p className="text-xs text-gray-600 mt-1.5">
                Write your raw idea. The more detail you give, the better the AI draft.
              </p>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Target platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={clsx(
                      "py-2 px-3 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2",
                      platform === p.value
                        ? "bg-purple-600/20 border-purple-600 text-purple-300"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    <span>{p.icon}</span> {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {draftError && (
            <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3">
              {draftError}
            </p>
          )}

          <button
            onClick={handleGenerateDraft}
            disabled={drafting || !ideas.trim()}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {drafting ? (
              <>
                <span className="animate-spin">⟳</span> Generating draft…
              </>
            ) : (
              "✨ Generate AI Draft →"
            )}
          </button>
        </div>
      )}

      {/* ── Step 2: Draft ────────────────────────────────────────── */}
      {step === "draft" && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <p className="text-xs text-gray-500">
              AI-generated draft — edit any field to make it yours.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Internal title for this post"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Hook
                <span className="text-gray-600 font-normal ml-2">— the opening line that grabs attention</span>
              </label>
              <input
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="The one sentence that makes someone stop scrolling…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="The main message…"
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Caption
                <span className="text-gray-600 font-normal ml-2">— ready to post, with hashtags</span>
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Full post caption with CTA and hashtags…"
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("idea")}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleDraftNext}
              disabled={!title.trim() || !caption.trim()}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              Next: Schedule →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Schedule ─────────────────────────────────────── */}
      {step === "schedule" && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
            <p className="text-xs text-gray-500">When should this post go out?</p>

            <div className="grid grid-cols-2 gap-3">
              {(["now", "later"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScheduleMode(mode)}
                  className={clsx(
                    "py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-left",
                    scheduleMode === mode
                      ? "bg-purple-600/20 border-purple-600 text-purple-300"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  )}
                >
                  {mode === "now" ? (
                    <><div className="text-base mb-0.5">⚡</div>Publish Now</>
                  ) : (
                    <><div className="text-base mb-0.5">🗓</div>Schedule</>
                  )}
                </button>
              ))}
            </div>

            {scheduleMode === "later" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Summary</p>
              <p className="text-sm text-gray-200 font-medium">{title}</p>
              {hook && <p className="text-xs text-purple-300 italic">"{hook}"</p>}
              <p className="text-xs text-gray-500">
                {PLATFORMS.find((p) => p.value === platform)?.icon}{" "}
                {PLATFORMS.find((p) => p.value === platform)?.label}
                {scheduleMode === "later" && scheduleDate
                  ? ` · Scheduled for ${scheduleDate} at ${scheduleTime}`
                  : " · Publish now"}
              </p>
            </div>
          </div>

          {submitError && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("draft")}
              className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (scheduleMode === "later" && !scheduleDate)}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? "Creating…" : scheduleMode === "later" ? "Schedule Post" : "Create Post"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
