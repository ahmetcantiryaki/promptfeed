import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile } from "@/lib/profiles";
import {
  getPlatformStats,
  isAdmin,
  listAllPosts,
  listAllProfilesWithEmail,
  listReports,
} from "@/lib/admin";
import { AdminClient } from "./admin-client";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin" },
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const admin = await isAdmin(user.id);
  if (!admin) notFound();

  const [profile, profiles, reports, stats, posts] = await Promise.all([
    getProfile(user.id),
    listAllProfilesWithEmail(),
    listReports(),
    getPlatformStats(),
    listAllPosts(),
  ]);

  return (
    <AdminClient
      profile={profile}
      profiles={profiles}
      reports={reports}
      stats={stats}
      posts={posts}
    />
  );
}
