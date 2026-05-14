const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type PostStatus = "Draft" | "Pending" | "Approved" | "Published" | "Rejected";
export type Platform = "instagram" | "tiktok" | "youtube_shorts" | "twitter" | "linkedin";

export interface Post {
  id: string;
  title: string;
  raw_prompt: string;
  caption_draft: string | null;
  variant_a_path: string | null;
  variant_b_path: string | null;
  brand_alignment_score: number | null;
  guardrail_passed: boolean | null;
  guardrail_notes: string | null;
  status: PostStatus;
  platform_target: Platform;
  winning_variant: "A" | "B" | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsRow {
  id: string;
  post_id: string;
  variant: "A" | "B";
  likes: number;
  shares: number;
  comments: number;
  views: number;
  watch_time_sec: number;
  engagement_rate: number;
  performance_tier: "Low" | "Mid" | "Viral" | null;
  snapshot_at: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  posts: {
    list: (params?: { status?: string; platform?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return apiFetch<Post[]>(`/posts${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => apiFetch<Post>(`/posts/${id}`),
    approve: (id: string, approvedBy: string, scheduledAt?: string) =>
      apiFetch<Post>(`/posts/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approved_by: approvedBy, scheduled_at: scheduledAt }),
      }),
    reject: (id: string) =>
      apiFetch<{ id: string; status: string }>(`/posts/${id}/reject`, { method: "PATCH" }),
  },
  analytics: {
    get: (postId: string) => apiFetch<AnalyticsRow[]>(`/analytics/${postId}`),
    latestLessons: () => apiFetch<unknown[]>("/analytics/lessons/latest"),
  },
};
