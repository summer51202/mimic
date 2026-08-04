import { AppRouteState } from "@/shared/ui/app-route-state";

export default function AppNotFound() {
  return <AppRouteState returnHref="/app/groups" variant="not-found" />;
}
