import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminaSocial Ultra",
  description: "Autonomous social media factory — approval portal",
};

const NAV = [
  { href: "/",          label: "Queue",     icon: "▦" },
  { href: "/trends",    label: "Trends",    icon: "↗" },
  { href: "/analytics", label: "Analytics", icon: "◎" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a12] text-gray-100 min-h-screen font-sans antialiased flex">

        {/* ── Glassmorphism Sidebar ───────────────────────────── */}
        <aside className="fixed top-0 left-0 h-screen w-56 glass border-r border-white/5 flex flex-col z-50 shrink-0">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-xs font-bold">L</span>
              <span className="font-bold text-sm tracking-tight">
                Lumina<span className="text-purple-400">Social</span>
              </span>
            </Link>
            <p className="text-[10px] text-gray-600 mt-0.5 ml-9">Ultra</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
              >
                <span className="text-base w-5 text-center group-hover:text-purple-400 transition-colors">{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Bottom */}
          <div className="px-3 py-4 border-t border-white/5 space-y-2">
            <Link
              href="/posts/new"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              <span>+</span> New Post
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
            >
              <span className="w-7 h-7 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-xs group-hover:border-purple-600 transition-colors">👤</span>
              <span>Profile & Brand</span>
            </Link>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────────── */}
        <main className="ml-56 flex-1 min-h-screen px-6 py-7 max-w-[calc(100vw-224px)]">
          {children}
        </main>

      </body>
    </html>
  );
}
