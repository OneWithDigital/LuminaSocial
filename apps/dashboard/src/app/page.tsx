"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { api, Post, Platform } from "@/lib/api";
import PostCard from "@/components/PostCard";

const STATUS_TABS = ["All", "Pending", "Draft", "Approved", "Published", "Rejected"] as const;

const PLATFORMS: { value: Platform | ""; label: string }[] = [
  { value: "",                label: "All platforms" },
  { value: "instagram",       label: "Instagram" },
  { value: "tiktok",          label: "TikTok" },
  { value: "youtube_shorts",  label: "YouTube Shorts" },
  { value: "twitter",         label: "Twitter / X" },
  { value: "linkedin",        label: "LinkedIn" },
];

export default function QueuePage() {
  const [activeStatus, setActiveStatus] = useState<string>("Pending");
  const [platform, setPlatform] = useState<Platform | "">("");

  const { data: posts, isLoading, mutate } = useSWR<Post[]>(
    ["posts", activeStatus, platform],
    () => api.posts.list({
      status:   activeStatus !== "All" ? activeStatus : undefined,
      platform: platform || undefined,
    }),
    { refreshInterval: 30_000 },
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-100">Content Queue</h1>
        <Link
          href="/posts/new"
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          + New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatus(tab)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeStatus === tab
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform | "")}
          className="ml-auto bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-purple-600"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500 mb-4">
        {isLoading ? "Loading…" : `${posts?.length ?? 0} post${posts?.length === 1 ? "" : "s"}`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onAction={() => mutate()} />
        ))}
      </div>

      {!isLoading && (posts?.length ?? 0) === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-sm mb-3">No {activeStatus !== "All" ? activeStatus.toLowerCase() : ""} posts found.</p>
          <Link href="/posts/new" className="text-purple-400 hover:text-purple-300 text-sm">
            Create your first post →
          </Link>
        </div>
      )}
    </div>
  );
}
