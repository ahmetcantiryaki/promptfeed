import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getProfile, getSocialAccounts } from "@/lib/profiles";
import { listModelsAndPlatforms } from "@/lib/posts";
import {
  getPlatformStats,
  isAdmin,
  listAllPosts,
  listAllProfilesWithEmail,
  listReports,
  listTaxonomyForAdmin,
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

  const [profile, profiles, reports, stats, posts, taxonomy, socials, mp] =
    await Promise.all([
      getProfile(user.id),
      listAllProfilesWithEmail(),
      listReports(),
      getPlatformStats(),
      listAllPosts(),
      listTaxonomyForAdmin(),
      getSocialAccounts(user.id),
      listModelsAndPlatforms(),
    ]);

  return (
    <AdminClient
      profile={profile}
      profiles={profiles}
      reports={reports}
      stats={stats}
      posts={posts}
      taxonomy={taxonomy}
      userId={user.id}
      socials={socials}
      models={mp.models}
      platforms={mp.platforms}
    />
  );
}
