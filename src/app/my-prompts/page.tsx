import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/profiles";
import { listMyPosts, getMyPostStats } from "@/lib/my-prompts";
import { MyPromptsClient } from "./my-prompts-client";

export const metadata = { title: "My prompts — PromptFeed" };

export default async function MyPromptsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const posts = await listMyPosts(user.id);
  const sourceUser = profile?.handle ? `@${profile.handle}` : null;

  const stats = await Promise.all(
    posts.map(async (p) =>
      sourceUser ? getMyPostStats(p.id, sourceUser) : { likes: 0, saves: 0, followers: 0 },
    ),
  );

  const totalLikes = stats.reduce((a, s) => a + s.likes, 0);
  const totalSaves = stats.reduce((a, s) => a + s.saves, 0);
  const followers = stats[0]?.followers ?? 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Back to feed
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-accent bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add new prompt
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold tracking-tight">My prompts</h1>
        <p className="text-[13px] text-text-muted">
          View the prompts you&apos;ve published, watch engagement, and remove
          anything you want to take down.
        </p>
      </header>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Prompts" value={posts.length} />
        <StatCard label="Total likes" value={totalLikes} />
        <StatCard label="Total saves" value={totalSaves} />
        <StatCard label="Followers" value={followers} />
      </div>

      <MyPromptsClient posts={posts} stats={stats} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border bg-surface-2/40 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        {label}
      </div>
      <div className="text-[22px] font-semibold tabular-nums tracking-tight text-text">
        {value}
      </div>
    </div>
  );
}
