import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminaSocial Ultra",
  description: "Autonomous social media factory — approval portal",
};

const NAV_LINKS = [
  { href: "/", label: "Queue" },
  { href: "/trends", label: "Trends" },
  { href: "/analytics", label: "Analytics" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6 sticky top-0 z-40 bg-gray-950/95 backdrop-blur">
          <Link href="/" className="text-base font-bold tracking-tight text-white shrink-0">
            Lumina<span className="text-purple-400">Social</span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto">
            <Link
              href="/posts/new"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              + New Post
            </Link>
          </div>
        </nav>
        <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
