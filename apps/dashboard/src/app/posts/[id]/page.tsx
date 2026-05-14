"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Post, AnalyticsRow } from "@/lib/api";
import BrandScoreBadge from "@/components/BrandScoreBadge";
import GuardrailPanel from "@/components/GuardrailPanel";
import VariantPlayer from "@/components/VariantPlayer";
import GenerateForm from "@/components/GenerateForm";
import SchedulePicker from "@/components/SchedulePicker";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [showScheduler, setShowScheduler] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recheckLoading, setRecheckLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: post, mutate, isLoading } = useSWR<Post>(
    id ? `post-${id}` : null,
    () => api.posts.get(id),
  );

  const { data: analytics } = useSWR<AnalyticsRow[]>(
    id ? `analytics-${id}` : null,
    () => api.analytics.get(id),
    { onError: () => undefined },
  );

  if (isLoading) {
    return <p className="text-gray-500 text-sm">Loading…</p>;
  }
  if (!post) {
    return (
      <div className="text-center py-20 text-gray-600">
        <p className="text-sm mb-3">Post not found.</p>
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">← Back to queue</Link>
      </div>
    );
  }

  const analyticsA = analytics?.find((a) => a.variant === "A") ?? null;
  const analyticsB = analytics?.find((a) => a.variant === "B") ?? null;
  const hasVariants = !!post.variant_a_path;

  async function handleApprove(scheduledAt?: string) {
    setActionLoading(true);
    setError(null);
    try {
      await api.posts.approve(post!.id, "dashboard_user", scheduledAt);
      setShowScheduler(false);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    setError(null);
    try {
      await api.posts.reject(post!.id);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRecheck() {
    setRecheckLoading(true);
    setError(null);
    try {
      await api.posts.recheck(post!.id);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recheck failed");
    } finally {
      setRecheckLoading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-100 mb-2">{post.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <BrandScoreBadge score={post.brand_alignment_score} passed={post.guardrail_passed} size="lg" />
            <span className="px-2.5 py-1 text-xs rounded-full bg-gray-800 text-gray-400">
              {post.platform_target}
            </span>
            {post.winning_variant && (
              <span className="px-2.5 py-1 text-xs rounded-full bg-purple-900/60 text-purple-300 font-medium">
                Winner: Variant {post.winning_variant}
              </span>
            )}
          </div>
        </div>
        <span className={`shrink-0 px-3 py-1 text-sm rounded-full font-medium ${
          post.status === "Pending"   ? "bg-yellow-900/60 text-yellow-300" :
          post.status === "Approved"  ? "bg-green-900/60 text-green-300"  :
          post.status === "Published" ? "bg-blue-900/60 text-blue-300"    :
          post.status === "Rejected"  ? "bg-red-900/60 text-red-400"      :
                                        "bg-gray-700/60 text-gray-300"
        }`}>
          {post.status}
        </span>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Caption */}
      {post.caption_draft && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Caption Draft</h2>
          <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{post.caption_draft}</p>
        </div>
      )}

      {/* Guardrail panel */}
      {post.brand_alignment_score != null && (
        <GuardrailPanel
          score={post.brand_alignment_score}
          passed={post.guardrail_passed ?? false}
          notes={post.guardrail_notes ?? ""}
        />
      )}

      {/* A/B Variant players */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">A/B Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariantPlayer
            variant="A"
            path={post.variant_a_path}
            durationSec={post.variant_a_duration_sec}
            isWinner={post.winning_variant === "A"}
            analytics={analyticsA}
          />
          <VariantPlayer
            variant="B"
            path={post.variant_b_path}
            durationSec={post.variant_b_duration_sec}
            isWinner={post.winning_variant === "B"}
            analytics={analyticsB}
          />
        </div>
      </div>

      {/* Generate form — Draft posts without videos */}
      {post.status === "Draft" && !hasVariants && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Generate Videos</h2>
          <GenerateForm
            postId={post.id}
            defaultCaption={post.caption_draft}
            onSuccess={() => mutate()}
          />
        </div>
      )}

      {/* Re-check button — Draft with existing variants */}
      {post.status === "Draft" && hasVariants && (
        <div className="flex gap-3">
          <button
            onClick={handleRecheck}
            disabled={recheckLoading}
            className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-yellow-400 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {recheckLoading ? "Checking…" : "Re-check Guardrail"}
          </button>
        </div>
      )}

      {/* Approve / Reject — Pending posts */}
      {post.status === "Pending" && (
        <div className="space-y-3">
          {showScheduler ? (
            <SchedulePicker
              onConfirm={handleApprove}
              onCancel={() => setShowScheduler(false)}
              loading={actionLoading}
            />
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowScheduler(true)}
                className="px-6 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
              >
                Approve & Schedule
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-6 py-2 rounded-lg bg-red-900 hover:bg-red-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Rejecting…" : "Reject"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
