import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/prompt/"],
        disallow: [
          "/admin",
          "/my-prompts",
          "/login",
          "/register",
          "/forgot-password",
          "/auth/",
          "/api/",
          "/?view=saved",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
