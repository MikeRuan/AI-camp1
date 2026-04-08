import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Builder Camp",
  description: "Build amazing websites and games with AI!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
