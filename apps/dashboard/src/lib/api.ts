const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostStatus = "Draft" | "Pending" | "Approved" | "Published" | "Rejected";
export type Platform = "instagram" | "tiktok" | "youtube_shorts" | "twitter" | "linkedin";
export type VideoStyle = "fast_aggressive" | "cinematic_minimal";
export type PerformanceTier = "Low" | "Mid" | "Viral";

export interface Post {
  id: string;
  title: string;
  raw_prompt: string;
  caption_draft: string | null;
  variant_a_path: string | null;
  variant_b_path: string | null;
  variant_a_duration_sec: number | null;
  variant_b_duration_sec: number | null;
  brand_alignment_score: number | null;
  guardrail_passed: boolean | null;
  guardrail_notes: string | null;
  guardrail_checked_at: string | null;
  status: PostStatus;
  platform_target: Platform;
  scheduled_at: string | null;
  published_at: string | null;
  winning_variant: "A" | "B" | null;
  trend_id: string | null;
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
  performance_tier: PerformanceTier | null;
  platform: Platform;
  snapshot_at: string;
}

export interface Trend {
  id: string;
  keyword: string;
  source: string;
  source_url: string | null;
  region: string;
  search_volume: number | null;
  related_topics: string[];
  fetched_at: string;
}

export interface LessonLearned {
  id: string;
  post_id: string | null;
  summary: string;
  winning_style: VideoStyle | null;
  winning_platform: Platform | null;
  engagement_delta: number | null;
  recommended_bias: {
    prefer_style?: VideoStyle;
    hook_duration_sec?: number;
    caption_tone?: string;
  };
  created_at: string;
}

export interface PostCreatePayload {
  title: string;
  raw_prompt: string;
  platform_target?: Platform;
  trend_id?: string;
  caption_draft?: string;
}

export interface UserProfile {
  id: number;
  display_name: string;
  avatar_url: string | null;
  website_url: string | null;
  bio: string | null;
  brand_voice: string | null;
  brand_colors: string[];
  brand_keywords: string[];
  connected_accounts: Record<string, { connected: boolean; handle?: string }>;
  updated_at: string;
}

export interface ProfileUpdatePayload {
  display_name?: string;
  avatar_url?: string;
  website_url?: string;
  bio?: string;
  brand_voice?: string;
  brand_colors?: string[];
  brand_keywords?: string[];
  connected_accounts?: Record<string, { connected: boolean; handle?: string }>;
}

export interface AIDraftPayload {
  ideas: string;
  platform?: string;
  brand_voice?: string;
}

export interface AIDraftResult {
  title: string;
  hook: string;
  body: string;
  caption: string;
}

export interface RemixRequest {
  input_type: "text" | "url";
  content: string;
  platforms: string[];
}

export interface PlatformDraft {
  platform: string;
  platform_name: string;
  body: string;
  hashtags: string[];
  char_limit: number;
}

export interface RemixBundle {
  source_summary: string;
  drafts: PlatformDraft[];
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

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

// ─── Video URL helper ─────────────────────────────────────────────────────────

export function videoUrl(storagePath: string): string {
  // storagePath is absolute on the server, e.g. /storage/outputs/variant_a/uuid.mp4
  // The API mounts /storage at the root path /storage
  return `${API_URL}${storagePath}`;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const api = {
  posts: {
    list: (params?: { status?: string; platform?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return apiFetch<Post[]>(`/posts${qs ? `?${qs}` : ""}`);
    },

    get: (id: string) => apiFetch<Post>(`/posts/${id}`),

    create: (payload: PostCreatePayload) =>
      apiFetch<Post>("/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    generate: (id: string, assetPath: string, caption?: string) =>
      apiFetch<Post>(`/posts/${id}/generate`, {
        method: "POST",
        body: JSON.stringify({ asset_path: assetPath, caption: caption ?? null }),
      }),

    recheck: (id: string) =>
      apiFetch<Post>(`/posts/${id}/recheck`, { method: "POST" }),

    approve: (id: string, approvedBy: string, scheduledAt?: string) =>
      apiFetch<Post>(`/posts/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approved_by: approvedBy, scheduled_at: scheduledAt ?? null }),
      }),

    reject: (id: string) =>
      apiFetch<{ id: string; status: string }>(`/posts/${id}/reject`, { method: "PATCH" }),
  },

  trends: {
    list: (limit = 30) => apiFetch<Trend[]>(`/trends?limit=${limit}`),
    fetchNow: (region = "US") =>
      apiFetch<{ inserted: number; trends: { id: string; keyword: string }[] }>(
        `/trends/fetch?region=${region}`,
        { method: "POST" }
      ),
  },

  analytics: {
    get: (postId: string) => apiFetch<AnalyticsRow[]>(`/analytics/${postId}`),
    lessons: (limit = 20) => apiFetch<LessonLearned[]>(`/analytics/lessons/latest?limit=${limit}`),
  },

  remix: {
    generate: (payload: RemixRequest) =>
      apiFetch<RemixBundle>("/remix/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  profile: {
    get: () => apiFetch<UserProfile>("/profile/"),

    update: (payload: ProfileUpdatePayload) =>
      apiFetch<UserProfile>("/profile/", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    scrape: (url: string) =>
      apiFetch<{ brand_voice: string; brand_keywords: string[]; bio: string }>("/profile/scrape", {
        method: "POST",
        body: JSON.stringify({ url }),
      }),

    aiDraft: (payload: AIDraftPayload) =>
      apiFetch<AIDraftResult>("/profile/ai-draft", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
