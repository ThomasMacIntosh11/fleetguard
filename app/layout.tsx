// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FleetGuard",
  description: "Canadian SMB fleet compliance made simple.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-200 text-slate-900 antialiased">
        {/* Header (same thickness as before) */}
        <header className="border-b bg-white">
          <div className="mx-auto flex h-30 max-w-7xl items-center justify-between px-4">
            {/* Left: Logo only (bigger), no text label */}
            <a href="/" className="flex items-center" aria-label="FleetGuard">
              {/* Use your actual logo path; height controls visual size. */}
              <img
                src="/logo.png"
                alt=""
                className="block h-12 w-auto md:h-40"
              />
            </a>

            {/* Right: Keep your original nav + button feel */}
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-700">
              <a href="#features" className="hover:text-gray-900 transition">
                Features
              </a>
              <a href="#how" className="hover:text-gray-900 transition">
                How it works
              </a>
              <a href="#pricing" className="hover:text-gray-900 transition">
                Pricing
              </a>
              <a href="#reviews" className="hover:text-gray-900 transition">
                Reviews
              </a>
              <a
                href="/app"
                className="rounded-full bg-slate-900 px-4 py-2 text-white shadow hover:bg-slate-800 transition"
              >
                Login
              </a>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </body>
    </html>
  );
}