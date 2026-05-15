"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { api, Post, PostStatus, Platform } from "@/lib/api";
import StatCard from "@/components/StatCard";
import BrainUpdateWidget from "@/components/BrainUpdateWidget";
import GlassCard from "@/components/GlassCard";
import PostCard from "@/components/PostCard";
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

export default function QueuePage() {
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

  const tally = (allPosts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const total     = allPosts?.length ?? 0;
  const pending   = tally["Pending"] ?? 0;
  const published = tally["Published"] ?? 0;
  const viral     = (allPosts ?? []).filter((p) => p.brand_alignment_score && p.brand_alignment_score >= 85).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your autonomous content pipeline.</p>
      </div>

      {/* Stat cards */}
      <div className="bento-grid">
        <StatCard label="Total Posts"      value={total}     icon="▦" accent="purple" sub="all time" />
        <StatCard label="Pending Approval" value={pending}   icon="◷" accent="amber"  sub="needs your review" />
        <StatCard label="Published"        value={published} icon="✓" accent="green"  sub="live posts" />
        <StatCard label="High-Score Posts" value={viral}     icon="★" accent="blue"   sub="brand score ≥ 85" />
      </div>

      {/* Queue + Brain */}
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
                    className="inline-flex px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
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
              <Link href="/profile" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-1">
                <span className="text-amber-400">◈</span> Brand Settings
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
