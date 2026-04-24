import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptFeed — AI İçerik Keşif Platformu",
  description:
    "Twitter, Reddit, Instagram, YouTube ve TikTok'taki AI üretimi içerikleri, onları üreten prompt ile yan yana keşfedin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning className={jetbrainsMono.variable}>
      <head>
        <script
          // Prevent flash of incorrect theme before React mounts.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('promptfeed.theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(_e){document.documentElement.setAttribute('data-theme','dark');}})();`,
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
      </body>
    </html>
  );
}
