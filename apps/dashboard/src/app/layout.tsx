import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminaSocial Ultra",
  description: "Autonomous social media factory — approval portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased">
        <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
          <span className="text-lg font-bold tracking-tight text-white">
            LuminaSocial <span className="text-purple-400">Ultra</span>
          </span>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Posts
          </a>
        </nav>
        <main className="px-6 py-8 max-w-7xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
