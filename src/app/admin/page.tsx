import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  getPlatformStats,
  isAdmin,
  listAllPosts,
  listAllProfiles,
  listReports,
} from "@/lib/admin";
import { AdminClient } from "./admin-client";

export const metadata = { title: "Admin — PromptFeed" };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const admin = await isAdmin(user.id);
  if (!admin) notFound();

  const [profiles, reports, stats, posts] = await Promise.all([
    listAllProfiles(),
    listReports(),
    getPlatformStats(),
    listAllPosts(),
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-6 px-6 py-10">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        Back to feed
      </Link>

      <header className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Admin panel
          </h1>
          <p className="text-[13px] text-text-muted">
            Manage users, handle reports, and watch the platform pulse.
          </p>
        </div>
        <span className="rounded-full border border-text/30 bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text">
          Admin
        </span>
      </header>

      <AdminClient
        profiles={profiles}
        reports={reports}
        stats={stats}
        posts={posts}
      />
    </div>
  );
}
