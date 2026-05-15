import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, TrendingUp, BarChart3, Link2, User, HelpCircle, Zap } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminaSocial Ultra",
  description: "Autonomous social media factory — approval portal",
};

const NAV_TOP = [
  { href: "/",            label: "Dashboard",   Icon: LayoutDashboard },
];

const NAV_MID = [
  { href: "/trends",      label: "Trends",      Icon: TrendingUp },
  { href: "/analytics",   label: "Analytics",   Icon: BarChart3 },
  { href: "/connections", label: "Connections",  Icon: Link2 },
];

function NavLink({ href, label, Icon }: { href: string; label: string; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
    >
      <Icon className="w-4 h-4 shrink-0 group-hover:text-purple-400 transition-colors" />
      {label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a12] text-gray-100 min-h-screen font-sans antialiased flex">

        {/* ── Glassmorphism Sidebar ─────────────────────────────── */}
        <aside className="fixed top-0 left-0 h-screen w-56 glass border-r border-white/5 flex flex-col z-50 shrink-0">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="font-bold text-sm tracking-tight">
                Lumina<span className="text-purple-400">Social</span>
              </span>
            </Link>
            <p className="text-[10px] text-gray-600 mt-0.5 ml-9">Ultra</p>
          </div>

          {/* Top nav */}
          <nav className="px-3 pt-4 pb-2">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1.5">Main</p>
            {NAV_TOP.map((item) => <NavLink key={item.href} {...item} />)}
          </nav>

          {/* Mid nav */}
          <nav className="px-3 pt-3 pb-2 border-t border-white/5">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1.5 mt-2">Content</p>
            {NAV_MID.map((item) => <NavLink key={item.href} {...item} />)}
          </nav>

          {/* Bottom */}
          <div className="mt-auto px-3 py-4 border-t border-white/5 space-y-1">
            <Link
              href="/posts/new"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-900/30 mb-2"
            >
              + New Post
            </Link>
            <NavLink href="/profile" label="Brand Settings" Icon={User} />
            <NavLink href="/help" label="Help" Icon={HelpCircle} />
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="ml-56 flex-1 min-h-screen px-6 py-7 max-w-[calc(100vw-224px)]">
          {children}
        </main>

      </body>
    </html>
  );
}
