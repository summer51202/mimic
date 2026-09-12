import { cookies } from "next/headers";

import { selectGroupId } from "@/features/groups/group-selection";
import { listGroups } from "@/features/groups/group-queries";
import { loadHome } from "@/features/home/home-queries";
import { HomePage } from "@/features/home/home-page";
import { AppReadFailure } from "@/shared/ui/app-read-failure";
import '@/features/home/home.css';

interface AppPageProps {
  searchParams?: Promise<{ group?: string | string[]; quick?: string | string[] }>;
}

const groupPreferenceCookie = "mimic_group";

export default async function AppPage({ searchParams }: AppPageProps) {
  const emptyParams: { group?: string | string[]; quick?: string | string[] } = {};
  const [params, cookieStore] = await Promise.all([
    searchParams ?? Promise.resolve(emptyParams),
    cookies(),
  ]);
  let groups;

  try {
    groups = await listGroups();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }
  const urlGroup = Array.isArray(params.group) ? params.group[0] : params.group;
  const quick = (Array.isArray(params.quick) ? params.quick[0] : params.quick) === '1';
  const selectedGroupId = urlGroup ? selectGroupId(urlGroup, undefined, groups)
    : quick ? selectGroupId(undefined, cookieStore.get(groupPreferenceCookie)?.value, groups) : null;
  try { return <HomePage data={await loadHome(selectedGroupId ?? undefined)} groups={groups} openQuick={quick} />; }
  catch (error) { return <AppReadFailure error={error} />; }
}
