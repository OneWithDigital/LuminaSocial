"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { api, Trend } from "@/lib/api";

export default function TrendsPage() {
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  const { data: trends, isLoading, mutate } = useSWR<Trend[]>(
    "trends",
    () => api.trends.list(50),
    { refreshInterval: 120_000 },
  );

  async function handleFetchNow() {
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await api.trends.fetchNow();
      setFetchMsg(`Fetched ${res.inserted} new trend${res.inserted === 1 ? "" : "s"}.`);
      mutate();
    } catch (err) {
      setFetchMsg(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Trends</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ingested trending topics — click any to create a post.</p>
        </div>
        <button
          onClick={handleFetchNow}
          disabled={fetching}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {fetching ? "Fetching…" : "Fetch New Trends"}
        </button>
      </div>

      {fetchMsg && (
        <p className="text-sm text-purple-300 bg-purple-950/30 border border-purple-800/50 rounded-lg px-4 py-2.5 mb-5">
          {fetchMsg}
        </p>
      )}

      {isLoading && (
        <p className="text-gray-500 text-sm">Loading trends…</p>
      )}

      {!isLoading && (trends?.length ?? 0) === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-sm mb-3">No trends ingested yet.</p>
          <button onClick={handleFetchNow} disabled={fetching} className="text-purple-400 hover:text-purple-300 text-sm">
            Fetch now →
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Keyword</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Region</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Volume</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Fetched</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trends?.map((trend) => (
              <tr key={trend.id} className="hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-200">{trend.keyword}</span>
                  {Array.isArray(trend.related_topics) && trend.related_topics.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(trend.related_topics as string[]).slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{trend.region}</td>
                <td className="px-4 py-3 text-right text-gray-400 tabular-nums hidden md:table-cell">
                  {trend.search_volume != null ? trend.search_volume.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{trend.source}</td>
                <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                  {new Date(trend.fetched_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/posts/new?trend_id=${trend.id}&keyword=${encodeURIComponent(trend.keyword)}`}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors whitespace-nowrap"
                  >
                    Create post →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
