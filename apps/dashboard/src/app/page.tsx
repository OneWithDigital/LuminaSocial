"use client";

import useSWR from "swr";
import { api, Post } from "@/lib/api";
import PostCard from "@/components/PostCard";

const STATUS_TABS = ["All", "Pending", "Draft", "Approved", "Published", "Rejected"] as const;

export default function HomePage() {
  const [activeTab, setActiveTab] = (
    require("react") as typeof import("react")
  ).useState<string>("Pending");

  const { data: posts, isLoading, mutate } = useSWR<Post[]>(
    ["posts", activeTab],
    () => api.posts.list(activeTab !== "All" ? { status: activeTab } : undefined),
    { refreshInterval: 30_000 },
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Queue</h1>
        <span className="text-sm text-gray-400">{posts?.length ?? 0} posts</span>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="text-gray-500 text-sm">Loading posts...</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onAction={() => mutate()} />
        ))}
      </div>

      {!isLoading && posts?.length === 0 && (
        <p className="text-gray-500 text-sm mt-8 text-center">
          No {activeTab !== "All" ? activeTab.toLowerCase() : ""} posts found.
        </p>
      )}
    </div>
  );
}
