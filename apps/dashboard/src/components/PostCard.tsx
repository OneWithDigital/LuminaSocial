"use client";

import { useState } from "react";
import Link from "next/link";
import { api, Post } from "@/lib/api";
import BrandScoreBadge from "./BrandScoreBadge";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  Draft:     "bg-gray-700/60 text-gray-300",
  Pending:   "bg-yellow-900/60 text-yellow-300",
  Approved:  "bg-green-900/60 text-green-300",
  Published: "bg-blue-900/60 text-blue-300",
  Rejected:  "bg-red-900/60 text-red-400",
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

  async function handleRecheck() {
    setLoading(true);
    try {
      await api.posts.recheck(post.id);
      onAction();
    } finally {
      setLoading(false);
    }
  }

  const hasVariants = !!post.variant_a_path;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-sm leading-snug line-clamp-2 flex-1 text-gray-100">
          {post.title}
        </h2>
        <span className={clsx(
          "shrink-0 px-2 py-0.5 text-xs rounded-full font-medium",
          STATUS_COLORS[post.status] ?? STATUS_COLORS.Draft,
        )}>
          {post.status}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <BrandScoreBadge score={post.brand_alignment_score} passed={post.guardrail_passed} />
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
          {post.platform_target}
        </span>
        {post.winning_variant && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-900/60 text-purple-300">
            Winner: Variant {post.winning_variant}
          </span>
        )}
      </div>

      {/* Guardrail notes snippet */}
      {post.guardrail_notes && !post.guardrail_passed && (
        <p className="text-xs text-yellow-500/80 italic line-clamp-2">{post.guardrail_notes}</p>
      )}

      {/* Variant status */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {(["A", "B"] as const).map((v) => {
          const path = v === "A" ? post.variant_a_path : post.variant_b_path;
          const dur  = v === "A" ? post.variant_a_duration_sec : post.variant_b_duration_sec;
          return (
            <div key={v} className="bg-gray-800/60 rounded-lg p-2">
              <div className="font-medium text-gray-300 mb-0.5">Variant {v}</div>
              {path ? (
                <span className="text-green-400">{dur ? `${dur.toFixed(1)}s` : "Ready"}</span>
              ) : (
                <span className="text-gray-600">Not generated</span>
              )}
              <div className="text-gray-600 mt-0.5">{v === "A" ? "fast / aggressive" : "cinematic / minimal"}</div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {post.status === "Pending" && (
        <div className="flex gap-2">
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

      {post.status === "Draft" && hasVariants && (
        <button
          onClick={handleRecheck}
          disabled={loading}
          className="w-full py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-yellow-400 text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Checking…" : "Re-check Guardrail"}
        </button>
      )}

      {/* Detail link */}
      <Link
        href={`/posts/${post.id}`}
        className="text-xs text-purple-400 hover:text-purple-300 text-center transition-colors"
      >
        {post.status === "Draft" && !hasVariants ? "Set up & Generate →" : "View detail →"}
      </Link>
    </div>
  );
}
