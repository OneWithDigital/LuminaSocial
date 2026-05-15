"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Film, FileText, CalendarDays, Upload, TrendingUp, Zap, Radio, Award } from "lucide-react";
import { api, Post, PostStatus, Platform, LessonLearned } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import PostCard from "@/components/PostCard";
import BrainUpdateWidget from "@/components/BrainUpdateWidget";
import clsx from "clsx";

const STATUS_TABS: { value: PostStatus | "All"; label: string }[] = [
  { value: "All",       label: "All" },
  { value: "Draft",     label: "Draft" },
  { value: "Pending",   label: "Pending" },
  { value: "Approved",  label: "Approved" },
  { value: "Published", label: "Published" },
  { value: "Rejected",  label: "Rejected" },
];

const STATUS_DOT: Record<string, string> = {
  Draft:     "bg-gray-500",
  Pending:   "bg-amber-400",
  Approved:  "bg-blue-400",
  Published: "bg-green-400",
  Rejected:  "bg-red-500",
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram:      "Instagram",
  tiktok:         "TikTok",
  youtube_shorts: "YouTube",
  twitter:        "Twitter/X",
  linkedin:       "LinkedIn",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [statusFilter, setStatusFilter] = useState<PostStatus | "All">("All");
  const [platformFilter, setPlatformFilter] = useState<Platform | "">("");

  const { data: posts, isLoading } = useSWR<Post[]>(
    ["posts", statusFilter, platformFilter],
    () => api.posts.list({
      status:   statusFilter !== "All" ? statusFilter : undefined,
      platform: platformFilter || undefined,
      limit:    50,
    }),
    { refreshInterval: 15_000 },
  );

  const { data: allPosts } = useSWR<Post[]>(
    "posts-all",
    () => api.posts.list({ limit: 200 }),
    { refreshInterval: 30_000 },
  );

  const { data: lessons } = useSWR<LessonLearned[]>(
    "brain-lessons-kpi",
    () => api.analytics.lessons(20),
    { refreshInterval: 60_000 },
  );

  const tally = (allPosts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const published     = tally["Published"] ?? 0;
  const aiHoursSaved  = Math.round((allPosts?.length ?? 0) * 2);

  const deltas    = (lessons ?? []).map((l) => l.engagement_delta).filter((d): d is number => d != null);
  const avgDelta  = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;

  const platformTally = (allPosts ?? [])
    .filter((p) => p.status === "Published")
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.platform_target] = (acc[p.platform_target] ?? 0) + 1;
      return acc;
    }, {});
  const topPlatform = Object.entries(platformTally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const latestCaption = (allPosts ?? []).find((p) => p.caption_draft)?.caption_draft ?? null;

  const now       = Date.now();
  const scheduled = (allPosts ?? [])
    .filter((p) => p.scheduled_at && new Date(p.scheduled_at).getTime() > now)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your autonomous content pipeline.</p>
      </div>

      {/* ── Row 1: KPI cards ─────────────────────────────────── */}
      <div className="bento-grid">
        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Live Posts</p>
            <Radio className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">{published}</p>
          <p className="text-[11px] text-gray-600">published & live</p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Avg Engagement Lift</p>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className={clsx(
            "text-3xl font-bold",
            avgDelta == null ? "text-gray-600" : avgDelta > 0 ? "text-purple-400" : "text-red-400",
          )}>
            {avgDelta != null ? `${avgDelta > 0 ? "+" : ""}${(avgDelta * 100).toFixed(1)}%` : "—"}
          </p>
          <p className="text-[11px] text-gray-600">vs baseline</p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">AI Hours Saved</p>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400">~{aiHoursSaved}h</p>
          <p className="text-[11px] text-gray-600">all time</p>
        </GlassCard>

        <GlassCard className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Top Channel</p>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          {topPlatform ? (
            <>
              <p className="text-2xl font-bold text-blue-400">{PLATFORM_LABEL[topPlatform] ?? topPlatform}</p>
              <p className="text-[11px] text-gray-600">{platformTally[topPlatform]} published posts</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-600">—</p>
              <p className="text-[11px] text-gray-600">publish to see winner</p>
            </>
          )}
        </GlassCard>
      </div>

      {/* ── Row 2: Service Boxes ─────────────────────────────── */}
      <div className="bento-grid">
        {/* Video Factory */}
        <GlassCard className="bento-span-2 service-box relative overflow-hidden min-h-[240px] flex flex-col gap-4">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/10 to-transparent pointer-events-none rounded-2xl" />
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex flex-col flex-1 gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Video Factory</p>
            </div>
            <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl min-h-[110px] bg-black/20">
              <div className="text-center">
                <Upload className="w-7 h-7 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Upload a clip or generate with AI</p>
              </div>
            </div>
            <Link
              href="/posts/new"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-semibold text-center transition-all shadow-lg shadow-purple-900/30 block"
            >
              Generate AI Edit
            </Link>
          </div>
        </GlassCard>

        {/* Post Architect */}
        <GlassCard className="bento-span-2 service-box relative overflow-hidden min-h-[240px] flex flex-col gap-4">
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="absolute h-px bg-white/[0.025]"
                style={{ top: `${22 + i * 19}px`, left: "5%", right: "5%" }}
              />
            ))}
          </div>
          <div className="relative flex flex-col flex-1 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Post Architect</p>
            </div>
            <div className="flex-1 bg-black/20 rounded-xl p-4 text-xs text-gray-500 leading-relaxed border border-white/5 min-h-[110px] line-clamp-5 overflow-hidden">
              {latestCaption ?? "Your next AI-generated caption will appear here. Hit the button below to start drafting with AI."}
            </div>
            <Link
              href="/posts/new"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-semibold text-center transition-all shadow-lg shadow-purple-900/30 block"
            >
              Write New Post
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* ── Row 3: Upcoming schedule ─────────────────────────── */}
      {scheduled.length > 0 && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Upcoming Schedule</p>
            </div>
            <span className="text-xs text-gray-600">{scheduled.length} post{scheduled.length !== 1 ? "s" : ""} queued</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {scheduled.slice(0, 3).map((post) => (
              <div key={post.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                <p className="text-[10px] text-gray-600 mb-1">{formatDate(post.scheduled_at)}</p>
                <p className="text-sm text-gray-200 truncate font-medium">{post.title}</p>
                <span className="text-[10px] text-blue-400">{PLATFORM_LABEL[post.platform_target] ?? post.platform_target}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Row 4: Queue + Brain ─────────────────────────────── */}
      <div className="bento-grid">
        <div className="bento-span-3 space-y-4">
          <GlassCard className="!p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {STATUS_TABS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                      statusFilter === value
                        ? "bg-purple-600/30 text-purple-300 border border-purple-600/50"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {value !== "All" && (
                      <span className={clsx("w-1.5 h-1.5 rounded-full", STATUS_DOT[value] ?? "bg-gray-500")} />
                    )}
                    {label}
                    {value !== "All" && tally[value] ? (
                      <span className="text-[10px] text-gray-600 ml-0.5">{tally[value]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as Platform | "")}
                className="ml-auto bg-gray-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-purple-600"
              >
                <option value="">All platforms</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="twitter">Twitter/X</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            <div className="divide-y divide-white/5">
              {isLoading && (
                <div className="px-5 py-10 text-center text-gray-600 text-sm">Loading…</div>
              )}
              {!isLoading && (!posts || posts.length === 0) && (
                <div className="px-5 py-16 text-center">
                  <p className="text-gray-600 text-sm mb-3">No posts yet.</p>
                  <Link
                    href="/posts/new"
                    className="inline-flex px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-medium transition-colors"
                  >
                    + Create your first post
                  </Link>
                </div>
              )}
              {posts?.map((post) => (
                <div key={post.id} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-4">
          <BrainUpdateWidget />
          <GlassCard>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/posts/new" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1">
                <span className="text-purple-400">+</span> New Post
              </Link>
              <Link href="/trends" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1">
                <span className="text-blue-400">↗</span> Browse Trends
              </Link>
              <Link href="/analytics" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1">
                <span className="text-green-400">◎</span> View Analytics
              </Link>
              <Link href="/connections" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1">
                <span className="text-amber-400">◈</span> Manage Connections
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
