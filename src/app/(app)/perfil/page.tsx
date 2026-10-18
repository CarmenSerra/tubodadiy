import type { Metadata } from "next";

import { ProfileView } from "@/components/auth/profile-view";
import { getRequestLang } from "@/lib/i18n/request";
import { getServerT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getServerT(await getRequestLang(), "account");
  return { title: t("profile.meta.title") };
}

export default function ProfilePage() {
  return <ProfileView />;
}
