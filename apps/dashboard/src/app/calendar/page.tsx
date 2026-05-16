"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api, Post } from "@/lib/api";
import GlassCard from "@/components/GlassCard";
import clsx from "clsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLOR: Record<string, string> = {
  Draft:     "bg-gray-600 text-gray-200",
  Pending:   "bg-amber-600/80 text-amber-100",
  Approved:  "bg-blue-600/80 text-blue-100",
  Published: "bg-green-600/80 text-green-100",
  Rejected:  "bg-red-700/80 text-red-100",
};

const PLATFORM_INITIALS: Record<string, string> = {
  instagram: "IG", tiktok: "TK", linkedin: "LI", twitter: "X", youtube_shorts: "YT",
};

function getPostDate(post: Post): Date | null {
  const raw = post.scheduled_at ?? post.published_at ?? null;
  return raw ? new Date(raw) : null;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const { data: posts } = useSWR<Post[]>(
    "posts-calendar",
    () => api.posts.list({ limit: 200 }),
    { refreshInterval: 30_000 },
  );

  const year  = current.getFullYear();
  const month = current.getMonth();

  const firstDay  = new Date(year, month, 1).getDay();   // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build grid cells (leading empty + day numbers)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function postsOnDay(day: number): Post[] {
    const d = new Date(year, month, day);
    return (posts ?? []).filter((p) => {
      const pd = getPostDate(p);
      return pd && isSameDay(pd, d);
    });
  }

  function prevMonth() { setCurrent(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrent(new Date(year, month + 1, 1)); }

  const monthName = current.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Summary counts
  const monthPosts = (posts ?? []).filter((p) => {
    const pd = getPostDate(p);
    return pd && pd.getFullYear() === year && pd.getMonth() === month;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Content Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">All your scheduled and published posts at a glance.</p>
      </div>

      {/* Month summary chips */}
      <div className="flex flex-wrap gap-2">
        {(["Pending", "Approved", "Published", "Draft"] as const).map((s) => {
          const count = monthPosts.filter((p) => p.status === s).length;
          return count > 0 ? (
            <span key={s} className={clsx("text-xs px-3 py-1 rounded-full", STATUS_COLOR[s])}>
              {count} {s}
            </span>
          ) : null;
        })}
        {monthPosts.length === 0 && (
          <span className="text-xs text-gray-600">No posts this month</span>
        )}
      </div>

      {/* Calendar card */}
      <GlassCard className="!p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <p className="text-sm font-semibold text-white">{monthName}</p>
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 divide-x divide-white/5">
          {cells.map((day, i) => {
            const isToday = day !== null && isSameDay(new Date(year, month, day), today);
            const dayPosts = day !== null ? postsOnDay(day) : [];
            return (
              <div
                key={i}
                className={clsx(
                  "min-h-[90px] p-2 border-b border-white/5 flex flex-col gap-1",
                  day === null && "bg-black/10",
                  isToday && "bg-purple-900/10",
                )}
              >
                {day !== null && (
                  <>
                    <span className={clsx(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isToday ? "bg-purple-600 text-white" : "text-gray-500",
                    )}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayPosts.slice(0, 3).map((post) => (
                        <div
                          key={post.id}
                          title={`${post.title} [${post.platform_target}]`}
                          className={clsx(
                            "text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1",
                            STATUS_COLOR[post.status],
                          )}
                        >
                          <span className="font-bold shrink-0">{PLATFORM_INITIALS[post.platform_target] ?? "—"}</span>
                          <span className="truncate">{post.title}</span>
                        </div>
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[10px] text-gray-600 px-1">+{dayPosts.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_COLOR).map(([status, cls]) => (
          <span key={status} className={clsx("text-[11px] px-2.5 py-1 rounded-full", cls)}>
            {status}
          </span>
        ))}
      </div>
    </div>
  );
}
