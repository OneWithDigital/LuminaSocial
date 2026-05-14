"use client";

import { useState } from "react";
import { api, Post } from "@/lib/api";
import BrandScoreBadge from "./BrandScoreBadge";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-700 text-gray-300",
  Pending: "bg-yellow-900 text-yellow-300",
  Approved: "bg-green-900 text-green-300",
  Published: "bg-blue-900 text-blue-300",
  Rejected: "bg-red-900 text-red-400",
};

interface Props {
  post: Post;
  onAction: () => void;
}

export default function PostCard({ post, onAction }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await api.posts.approve(post.id, "dashboard_user");
      onAction();
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      await api.posts.reject(post.id);
      onAction();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">
          {post.title}
        </h2>
        <span
          className={clsx(
            "shrink-0 px-2 py-0.5 text-xs rounded-full font-medium",
            STATUS_COLORS[post.status] ?? "bg-gray-700 text-gray-300",
          )}
        >
          {post.status}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <BrandScoreBadge score={post.brand_alignment_score} passed={post.guardrail_passed} />
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
          {post.platform_target}
        </span>
        {post.winning_variant && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-900 text-purple-300">
            Winner: Variant {post.winning_variant}
          </span>
        )}
      </div>

      {post.guardrail_notes && (
        <p className="text-xs text-gray-400 italic line-clamp-2">{post.guardrail_notes}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mt-1">
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="font-medium text-gray-300 mb-1">Variant A</div>
          {post.variant_a_path ? (
            <span className="text-green-400">Ready</span>
          ) : (
            <span className="text-gray-600">Not generated</span>
          )}
          <div className="text-gray-600 mt-0.5">fast / aggressive</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="font-medium text-gray-300 mb-1">Variant B</div>
          {post.variant_b_path ? (
            <span className="text-green-400">Ready</span>
          ) : (
            <span className="text-gray-600">Not generated</span>
          )}
          <div className="text-gray-600 mt-0.5">cinematic / minimal</div>
        </div>
      </div>

      {post.status === "Pending" && (
        <div className="flex gap-2 mt-1">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      <a
        href={`/posts/${post.id}`}
        className="text-xs text-purple-400 hover:text-purple-300 text-center transition-colors"
      >
        View full detail →
      </a>
    </div>
  );
}
