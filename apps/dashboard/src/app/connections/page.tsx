"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, UserProfile } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import { Plus, RefreshCw, Wifi, WifiOff, Link2, ShoppingBag, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface AccountState {
  connected: boolean;
  handle?: string;
  auto_publish?: boolean;
  fetch_analytics?: boolean;
}

const PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    bg: "from-blue-600 to-blue-800",
    text: "f",
    description: "Pages, Groups & Reels",
  },
  {
    key: "instagram",
    label: "Instagram",
    bg: "from-purple-600 to-pink-600",
    text: "IG",
    description: "Reels, Stories & Feed posts",
  },
  {
    key: "tiktok",
    label: "TikTok",
    bg: "from-gray-800 to-gray-900",
    text: "TK",
    ring: "ring-cyan-400",
    description: "Short-form video content",
  },
  {
    key: "youtube_shorts",
    label: "YouTube",
    bg: "from-red-700 to-red-900",
    text: "YT",
    description: "Shorts & long-form video",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    bg: "from-gray-900 to-black",
    text: "𝕏",
    description: "Posts, threads & media",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    bg: "from-blue-700 to-blue-900",
    text: "in",
    description: "Professional articles & video",
  },
];

function ScopeToggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="flex items-center justify-between w-full py-1 text-left group"
    >
      <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">{label}</span>
      <div className={clsx("relative w-8 h-4 rounded-full transition-colors shrink-0", enabled ? "bg-purple-600" : "bg-gray-700")}>
        <span className={clsx(
          "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-4" : "translate-x-0.5",
        )} />
      </div>
    </button>
  );
}

interface ShopifyStatus {
  connected: boolean;
  shop_name?: string;
  shop_domain?: string;
  plan?: string;
  currency?: string;
}

export default function ConnectionsPage() {
  const { data: profile, mutate } = useSWR<UserProfile>("profile", api.profile.get);
  const { data: shopifyStatus, error: shopifyError } = useSWR<ShopifyStatus>(
    "shopify-status",
    () => fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/shopify/status`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .catch(() => ({ connected: false })),
    { revalidateOnFocus: false },
  );
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const accounts: Record<string, AccountState> = profile?.connected_accounts ?? {};

  async function updateAccount(key: string, patch: Partial<AccountState>) {
    setSaving(key);
    const current = accounts[key] ?? { connected: false };
    try {
      await api.profile.update({
        connected_accounts: {
          ...accounts,
          [key]: { ...current, ...patch },
        },
      });
      mutate();
    } finally {
      setSaving(null);
    }
  }

  async function connect(key: string) {
    await updateAccount(key, { connected: true, auto_publish: false, fetch_analytics: true });
    setShowAdd(false);
  }

  const connected = PLATFORMS.filter((p) => accounts[p.key]?.connected);
  const unconnected = PLATFORMS.filter((p) => !accounts[p.key]?.connected);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Connections Hub</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your living links to each social platform.
        </p>
      </div>

      {/* Connected channels grid */}
      {connected.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Active Channels
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connected.map((p) => {
              const acct = accounts[p.key] ?? {};
              const isSaving = saving === p.key;
              return (
                <GlassCard key={p.key} className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0",
                      p.bg,
                    )}>
                      {p.text}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white">{p.label}</p>
                        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Connected" />
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {acct.handle ? `@${acct.handle}` : p.description}
                      </p>
                    </div>
                    <Wifi className="w-4 h-4 text-green-400 shrink-0" />
                  </div>

                  {/* Scope toggles */}
                  <div className="bg-white/5 rounded-xl px-3 py-2 space-y-1">
                    <ScopeToggle
                      label="Auto-Publish"
                      enabled={!!acct.auto_publish}
                      onChange={() => updateAccount(p.key, { auto_publish: !acct.auto_publish })}
                    />
                    <ScopeToggle
                      label="Fetch Analytics"
                      enabled={!!acct.fetch_analytics}
                      onChange={() => updateAccount(p.key, { fetch_analytics: !acct.fetch_analytics })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAccount(p.key, {})}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
                    >
                      <RefreshCw className={clsx("w-3 h-3", isSaving && "animate-spin")} />
                      Refresh
                    </button>
                    <button
                      onClick={() => updateAccount(p.key, { connected: false })}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-red-900/40 hover:border-red-700/50 ml-auto"
                    >
                      <WifiOff className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </GlassCard>
              );
            })}

            {/* Add New card */}
            <button
              onClick={() => setShowAdd(true)}
              className="min-h-[180px] rounded-2xl border-2 border-dashed border-white/10 hover:border-purple-600/50 flex flex-col items-center justify-center gap-3 transition-all group hover:bg-purple-900/10"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-purple-600/20 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-sm text-gray-600 group-hover:text-gray-400 transition-colors">Add Channel</p>
            </button>
          </div>
        </div>
      )}

      {/* Empty state or Add New prompt */}
      {connected.length === 0 && !showAdd && (
        <GlassCard className="py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <Link2 className="w-6 h-6 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-medium mb-1">No channels connected yet</p>
            <p className="text-sm text-gray-600 max-w-xs">
              Connect your social platforms to enable one-click publishing and analytics syncing.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-semibold transition-all"
          >
            + Connect First Channel
          </button>
        </GlassCard>
      )}

      {/* Shopify integration */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Data Sources
        </p>
        <GlassCard className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white">Shopify</p>
                {shopifyStatus?.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" title="Connected" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" title="Not configured" />
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {shopifyStatus?.connected
                  ? `${shopifyStatus.shop_name} · ${shopifyStatus.currency}`
                  : "Connect your store to generate product posts"}
              </p>
            </div>
          </div>

          {shopifyStatus?.connected ? (
            <div className="bg-white/5 rounded-xl px-3 py-2 space-y-1 text-xs text-gray-400">
              <p><span className="text-gray-600">Domain</span> &nbsp;{shopifyStatus.shop_domain}</p>
              <p><span className="text-gray-600">Plan</span> &nbsp;&nbsp;&nbsp;{shopifyStatus.plan}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-600 bg-white/5 rounded-xl px-3 py-2">
              Add <code className="text-gray-500">SHOPIFY_STORE_URL</code> and{" "}
              <code className="text-gray-500">SHOPIFY_ACCESS_TOKEN</code> to your{" "}
              <code className="text-gray-500">.env</code> file to enable Shopify product remixing.
            </p>
          )}

          <p className="text-xs text-gray-600">
            Once connected, use{" "}
            <span className="text-purple-400">shopify_remix_product</span> in the MCP server or the
            Remix page to turn any product into platform-native social posts.
          </p>
        </GlassCard>
      </div>

      {/* Add channel modal */}
      {showAdd && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Choose a Platform</p>
            <button
              onClick={() => setShowAdd(false)}
              className="text-gray-600 hover:text-gray-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            {unconnected.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">All platforms connected!</p>
            ) : (
              unconnected.map((p) => (
                <button
                  key={p.key}
                  onClick={() => connect(p.key)}
                  disabled={saving === p.key}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                >
                  <div className={clsx(
                    "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0",
                    p.bg,
                  )}>
                    {p.text}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{p.label}</p>
                    <p className="text-xs text-gray-600">{p.description}</p>
                  </div>
                  <Plus className="w-4 h-4 text-gray-600 group-hover:text-purple-400 ml-auto transition-colors" />
                </button>
              ))
            )}
          </div>
          <p className="text-xs text-gray-600 mt-4 pt-4 border-t border-white/5">
            Add platform API tokens to your <code className="text-gray-500">.env</code> file to enable live publishing.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

