import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from "@/lib/site";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).origin;
  } catch {
    return null;
  }
})();

const GA_MEASUREMENT_ID = "G-HFTLQW1JZ7";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Fraunces only ships on the /changelog editorial surface. preload:false keeps
// the discover feed unaffected; CSS variable is still globally available so
// the scoped layout can opt-in.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "700", "900"],
  style: ["normal", "italic"],
  preload: false,
});

const DEFAULT_TITLE =
  "Feedlens.ai — Discover, copy, and remix AI image prompts";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s — Feedlens.ai",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/logos/og-default-1200x630.png",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/logos/og-twitter-1200x675.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/logos/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logos/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/logos/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // iOS/Android: when the on-screen keyboard appears, shrink the layout
  // viewport instead of overlaying it. Combined with auto scrollIntoView
  // on focus, this keeps the focused input visible above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <head>
        {SUPABASE_ORIGIN ? (
          <>
            <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />
          </>
        ) : null}
        <script
          // Prevent flash of incorrect theme before React mounts.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('promptfeed.theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(_e){document.documentElement.setAttribute('data-theme','dark');}})();`,
          }}
        />
        <script
          type="application/ld+json"
          // Site-wide WebSite + Organization markup. Sitelinks search box is
          // wired so Google can offer in-SERP search of the prompt archive.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#org`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: `${SITE_URL}/logos/og-default-1200x630.png`,
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: SITE_NAME,
                  description: DEFAULT_DESCRIPTION,
                  publisher: { "@id": `${SITE_URL}/#org` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            },
          }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
