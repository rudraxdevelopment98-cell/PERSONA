import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { I18nProvider } from "@/lib/i18n/client";
import { getLang } from "@/lib/i18n/server";
import { dictFor } from "@/lib/i18n/dicts";
import { languageInfo } from "@/lib/domain/languages";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "PERSONA 90", template: "%s · PERSONA 90" },
  description: "Understand yourself. Challenge yourself. Become yourself. A 90-day personal development programme.",
  applicationName: "PERSONA 90",
  appleWebApp: { capable: true, title: "PERSONA 90", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  openGraph: {
    type: "website",
    siteName: "PERSONA 90",
    title: "PERSONA 90 · Roz ek kahani, faisla tumhara",
    description: "90 days, 30 minutes a day: interactive stories, practice and an AI coach for confidence, communication and decisions. Free to start.",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#26364A" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1117" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("p90-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "en" || lang === "hinglish" ? "en-IN" : languageInfo(lang).speech} className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <I18nProvider lang={lang} dict={dictFor(lang)}>
          {children}
          <ServiceWorker />
        </I18nProvider>
      </body>
    </html>
  );
}
