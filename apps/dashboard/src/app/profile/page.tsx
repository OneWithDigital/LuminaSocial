"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import clsx from "clsx";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "📷" },
  { key: "tiktok",    label: "TikTok",    icon: "🎵" },
  { key: "youtube",   label: "YouTube",   icon: "▶️" },
  { key: "twitter",   label: "Twitter/X", icon: "𝕏" },
  { key: "linkedin",  label: "LinkedIn",  icon: "💼" },
];

export default function ProfilePage() {
  const { data: profile, mutate, isLoading } = useSWR("profile", api.profile.get);

  const [saving, setSaving]         = useState(false);
  const [scraping, setScraping]     = useState(false);
  const [scrapeUrl, setScrapeUrl]   = useState("");
  const [scrapeMsg, setScrapeMsg]   = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    avatar_url: "",
    website_url: "",
    bio: "",
    brand_voice: "",
    brand_colors: "",
    brand_keywords: "",
  });

  // Sync form from loaded profile (once)
  const synced = useRef(false);
  if (profile && !synced.current) {
    synced.current = true;
    setForm({
      display_name:   profile.display_name ?? "",
      avatar_url:     profile.avatar_url ?? "",
      website_url:    profile.website_url ?? "",
      bio:            profile.bio ?? "",
      brand_voice:    profile.brand_voice ?? "",
      brand_colors:   (profile.brand_colors ?? []).join(", "),
      brand_keywords: (profile.brand_keywords ?? []).join(", "),
    });
    setScrapeUrl(profile.website_url ?? "");
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.profile.update({
        display_name:   form.display_name || undefined,
        avatar_url:     form.avatar_url || undefined,
        website_url:    form.website_url || undefined,
        bio:            form.bio || undefined,
        brand_voice:    form.brand_voice || undefined,
        brand_colors:   form.brand_colors ? form.brand_colors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        brand_keywords: form.brand_keywords ? form.brand_keywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleScrape() {
    if (!scrapeUrl) return;
    setScraping(true);
    setScrapeMsg(null);
    try {
      const result = await api.profile.scrape(scrapeUrl);
      setForm((f) => ({
        ...f,
        brand_voice:    result.brand_voice    || f.brand_voice,
        brand_keywords: result.brand_keywords?.join(", ") || f.brand_keywords,
        bio:            result.bio            || f.bio,
        website_url:    scrapeUrl,
      }));
      setScrapeMsg("Brand guidelines imported from your website.");
    } catch (err) {
      setScrapeMsg(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  }

  function toggleAccount(key: string) {
    const accounts = profile?.connected_accounts ?? {};
    const current  = accounts[key];
    api.profile.update({
      connected_accounts: {
        ...accounts,
        [key]: current?.connected ? { connected: false } : { connected: true },
      },
    }).then(() => mutate());
  }

  const connected = profile?.connected_accounts ?? {};

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-100">Account & Brand</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile, connected platforms, and brand guidelines.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-10">

        {/* ── Identity ───────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Identity</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : "👤"}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Avatar URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                  {...field("avatar_url")}
                />
                <p className="text-xs text-gray-600 mt-1">Paste a public image URL or a direct link from your website.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Display Name</label>
              <input
                type="text"
                placeholder="Your brand or company name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                {...field("display_name")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Bio</label>
              <textarea
                rows={2}
                placeholder="One or two sentences about your brand…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none"
                {...field("bio")}
              />
            </div>
          </div>
        </section>

        {/* ── Connected Accounts ─────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Connected Platforms</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="space-y-3">
              {PLATFORMS.map(({ key, label, icon }) => {
                const isOn = !!connected[key]?.connected;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-7 text-center">{icon}</span>
                      <span className="text-sm text-gray-200">{label}</span>
                      {isOn && (
                        <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/50 px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAccount(key)}
                      className={clsx(
                        "text-xs px-3 py-1.5 rounded-lg border transition-colors",
                        isOn
                          ? "border-red-800 text-red-400 hover:bg-red-950/30"
                          : "border-purple-700 text-purple-400 hover:bg-purple-900/20"
                      )}
                    >
                      {isOn ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Connecting a platform enables one-click publishing. Add your API tokens in the <code className="text-gray-500">.env</code> file to activate publishing.
            </p>
          </div>
        </section>

        {/* ── Brand Guidelines ───────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Brand Guidelines</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">

            {/* Website scraper */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-200 mb-3">Import from your website</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://yourbrand.com"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={handleScrape}
                  disabled={scraping || !scrapeUrl}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {scraping ? "Scanning…" : "Scan Site"}
                </button>
              </div>
              {scrapeMsg && (
                <p className={clsx("text-xs mt-2", scrapeMsg.startsWith("Brand") ? "text-green-400" : "text-red-400")}>
                  {scrapeMsg}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2">
                AI will read your homepage and extract your tone, keywords, and description automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Website URL</label>
              <input
                type="url"
                placeholder="https://yourbrand.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                {...field("website_url")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Brand Voice & Tone</label>
              <textarea
                rows={3}
                placeholder="e.g. Bold and motivational. We speak directly to ambitious entrepreneurs who want results fast. Never corporate, always human."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600 resize-none"
                {...field("brand_voice")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Brand Keywords</label>
              <input
                type="text"
                placeholder="growth, results, authentic, community, …  (comma-separated)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                {...field("brand_keywords")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Brand Colors</label>
              <input
                type="text"
                placeholder="#7C3AED, #1E1E2E, #F5F5F5  (comma-separated hex codes)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-purple-600"
                {...field("brand_colors")}
              />
              {/* Color preview chips */}
              {form.brand_colors && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {form.brand_colors.split(",").map((c) => c.trim()).filter((c) => c.startsWith("#")).map((c) => (
                    <div
                      key={c}
                      className="w-6 h-6 rounded-full border border-gray-700"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Save ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || isLoading}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {saved && <span className="text-sm text-green-400">Saved!</span>}
        </div>
      </form>
    </div>
  );
}
