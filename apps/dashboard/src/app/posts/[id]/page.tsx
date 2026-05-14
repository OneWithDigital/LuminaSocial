"use client";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { api, Post, AnalyticsRow } from "@/lib/api";
import BrandScoreBadge from "@/components/BrandScoreBadge";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: post, mutate } = useSWR<Post>(id && `post-${id}`, () => api.posts.get(id));
  const { data: analytics } = useSWR<AnalyticsRow[]>(
    id && `analytics-${id}`,
    () => api.analytics.get(id),
    { onError: () => undefined },
  );

  if (!post) return <p className="text-gray-500">Loading...</p>;

  const variantA = analytics?.filter((a) => a.variant === "A") ?? [];
  const variantB = analytics?.filter((a) => a.variant === "B") ?? [];

  async function approve() {
    await api.posts.approve(post!.id, "dashboard_user");
    mutate();
  }
  async function reject() {
    await api.posts.reject(post!.id);
    mutate();
  }

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white mb-4">
        ← Back
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold">{post.title}</h1>
        <BrandScoreBadge score={post.brand_alignment_score} passed={post.guardrail_passed} />
      </div>

      {post.caption_draft && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">Caption Draft</h2>
          <p className="text-sm whitespace-pre-wrap">{post.caption_draft}</p>
        </div>
      )}

      {post.guardrail_notes && (
        <div className="bg-yellow-950 border border-yellow-800 rounded-xl p-4 mb-6 text-sm text-yellow-200">
          <span className="font-semibold">Guardrail Notes:</span> {post.guardrail_notes}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {(["A", "B"] as const).map((variant) => {
          const path = variant === "A" ? post.variant_a_path : post.variant_b_path;
          const style = variant === "A" ? "Fast / Aggressive" : "Cinematic / Minimal";
          const rows = variant === "A" ? variantA : variantB;
          const latest = rows[0];
          return (
            <div key={variant} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Variant {variant}</h3>
                <span className="text-xs text-gray-500">{style}</span>
              </div>
              {path ? (
                <video
                  src={`/api/storage${path}`}
                  controls
                  className="w-full rounded-lg bg-black aspect-[9/16] object-contain"
                />
              ) : (
                <div className="w-full aspect-[9/16] bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-xs">
                  Not generated yet
                </div>
              )}
              {latest && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="text-gray-400">Views</div><div className="font-semibold">{latest.views.toLocaleString()}</div></div>
                  <div><div className="text-gray-400">Likes</div><div className="font-semibold">{latest.likes.toLocaleString()}</div></div>
                  <div><div className="text-gray-400">Eng. Rate</div><div className="font-semibold">{(latest.engagement_rate * 100).toFixed(2)}%</div></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {post.status === "Pending" && (
        <div className="flex gap-3">
          <button
            onClick={approve}
            className="px-6 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold transition-colors"
          >
            Approve & Schedule
          </button>
          <button
            onClick={reject}
            className="px-6 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
