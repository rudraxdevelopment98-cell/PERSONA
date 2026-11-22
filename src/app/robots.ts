import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Public pages are indexable; the app, APIs and private invite links are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/pricing", "/about", "/terms", "/privacy", "/refund", "/advertise"], disallow: ["/api/", "/i/", "/admin", "/dashboard", "/today", "/settings"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
