import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PERSONA 90", template: "%s · PERSONA 90" },
  description: "Understand yourself. Challenge yourself. Become yourself. A 90-day personal development programme.",
};

export const viewport: Viewport = { themeColor: "#F8F9FA" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
