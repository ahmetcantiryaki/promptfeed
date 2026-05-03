import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const MAX_NAME_LEN = 60;
const MAX_ICON_URL_LEN = 500;

type Kind = "model" | "platform";

interface CreateBody {
  kind: Kind;
  slug: string;
  name: string;
  iconUrl: string | null;
}

interface DeleteBody {
  kind: Kind;
  slug: string;
}

function isHttpsUrl(v: string): boolean {
  if (v.length > MAX_ICON_URL_LEN) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isPathUrl(v: string): boolean {
  // Allow absolute paths under /logos /icons /assets.
  return /^\/(logos|icons|assets)\/[A-Za-z0-9._\-/]+$/.test(v);
}

function parseCreate(raw: unknown): CreateBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "model" && r.kind !== "platform") return null;
  if (typeof r.slug !== "string" || !SLUG_RE.test(r.slug)) return null;
  if (typeof r.name !== "string") return null;
  const name = r.name.trim();
  if (!name || name.length > MAX_NAME_LEN) return null;

  let iconUrl: string | null = null;
  if (r.iconUrl != null) {
    if (typeof r.iconUrl !== "string") return null;
    const v = r.iconUrl.trim();
    if (v.length > 0) {
      if (!(isHttpsUrl(v) || isPathUrl(v))) return null;
      iconUrl = v;
    }
  }
  return { kind: r.kind, slug: r.slug, name, iconUrl };
}

function parseDelete(raw: unknown): DeleteBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "model" && r.kind !== "platform") return null;
  if (typeof r.slug !== "string" || !SLUG_RE.test(r.slug)) return null;
  return { kind: r.kind, slug: r.slug };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 },
    );
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json(
      { success: false, error: "forbidden" },
      { status: 403 },
    );
  }
  const limited = await rateLimit({
    bucket: "api:admin:taxonomy",
    limit: 30,
    windowSec: 60,
    identifier: user.id,
  });
  if (!limited.ok) return tooManyRequests(limited);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const body = parseCreate(raw);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const table = body.kind === "model" ? "models" : "platforms";
  const { data, error } = await supabase
    .from(table)
    .insert({ slug: body.slug, name: body.name, icon_url: body.iconUrl })
    .select("slug, name, icon_url, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "slug_taken" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: "db_error" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, data, error: null });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "unauthenticated" },
      { status: 401 },
    );
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json(
      { success: false, error: "forbidden" },
      { status: 403 },
    );
  }
  const limited = await rateLimit({
    bucket: "api:admin:taxonomy",
    limit: 30,
    windowSec: 60,
    identifier: user.id,
  });
  if (!limited.ok) return tooManyRequests(limited);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 },
    );
  }
  const body = parseDelete(raw);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const table = body.kind === "model" ? "models" : "platforms";
  const column = body.kind === "model" ? "model_slug" : "platform_slug";

  // Block delete when posts still reference the slug.
  const { count, error: countErr } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq(column, body.slug);
  if (countErr) {
    return NextResponse.json(
      { success: false, error: "db_error" },
      { status: 400 },
    );
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { success: false, error: "in_use", postCount: count ?? 0 },
      { status: 409 },
    );
  }

  const { error } = await supabase.from(table).delete().eq("slug", body.slug);
  if (error) {
    return NextResponse.json(
      { success: false, error: "db_error" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, error: null });
}
