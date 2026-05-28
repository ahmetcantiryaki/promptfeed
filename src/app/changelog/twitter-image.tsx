import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  formatDateline,
  formatIssueNumber,
  getLatestEntry,
} from "@/lib/changelog";

// Twitter card mirrors the OG cover. Next 16 does not detect re-exported
// config (`runtime`, `size` etc.) so each file declares its own metadata
// and renders a fresh ImageResponse.
export const alt = "Feedlens Dispatch — the latest issue";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#E63946";
const INK = "#0A0A0A";
const PAPER = "#F5F1E8";

export default async function Image() {
  const entry = getLatestEntry();

  const [frauncesItalic, frauncesRegular, jetMono] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-BlackItalic.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Fraunces-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/JetBrainsMono-Medium.ttf")),
  ]);

  const { first, rest } = splitHeadline(entry.headline);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          color: INK,
          padding: "56px 64px",
          fontFamily: "JetBrains Mono",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${INK}`,
            borderBottom: `2px solid ${INK}`,
            padding: "14px 0",
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span>Feedlens</span>
          <span style={{ opacity: 0.7 }}>The Dispatch · Vol. I</span>
          <span>{`No. ${formatIssueNumber(entry.issue)}`}</span>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            paddingTop: 28,
            gap: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 360,
            }}
          >
            <div
              style={{
                display: "flex",
                fontFamily: "Fraunces",
                fontStyle: "italic",
                fontWeight: 900,
                fontSize: 200,
                lineHeight: 0.86,
                letterSpacing: "-0.05em",
                color: INK,
              }}
            >
              {formatIssueNumber(entry.issue)}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: ACCENT,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                {formatDateline(entry.date)}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              paddingTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 18,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                opacity: 0.75,
                marginBottom: 18,
              }}
            >
              In this issue
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontFamily: "Fraunces",
                fontSize: 88,
                lineHeight: 0.96,
                letterSpacing: "-0.022em",
                color: INK,
              }}
            >
              <span style={{ fontStyle: "italic", fontWeight: 900 }}>{first}</span>
              {rest ? (
                <span style={{ fontWeight: 400 }}>{rest}</span>
              ) : null}
            </div>
            {entry.dek ? (
              <div
                style={{
                  display: "flex",
                  fontFamily: "Fraunces",
                  fontStyle: "italic",
                  fontSize: 28,
                  lineHeight: 1.35,
                  marginTop: 28,
                  opacity: 0.72,
                  maxWidth: 620,
                }}
              >
                {`— ${entry.dek}`}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${INK}`,
            paddingTop: 14,
            fontSize: 15,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 7,
                height: 7,
                borderRadius: 999,
                backgroundColor: ACCENT,
              }}
            />
            <span>feedlens.ai / changelog</span>
          </div>
          <span style={{ opacity: 0.65 }}>{`v${entry.version}`}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: frauncesItalic, weight: 900, style: "italic" },
        { name: "Fraunces", data: frauncesRegular, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: jetMono, weight: 500, style: "normal" },
      ],
    },
  );
}

function splitHeadline(headline: string): { first: string; rest: string } {
  const idx = headline.indexOf(",");
  if (idx <= 0) return { first: headline, rest: "" };
  return {
    first: headline.slice(0, idx + 1).trim(),
    rest: headline.slice(idx + 1).trim(),
  };
}
