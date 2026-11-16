import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PERSONA 90", template: "%s · PERSONA 90" },
  description: "Understand yourself. Challenge yourself. Become yourself. A 90-day personal development programme.",
  applicationName: "PERSONA 90",
  appleWebApp: { capable: true, title: "PERSONA 90", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("p90-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
