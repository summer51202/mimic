import type { useRouter } from "next/navigation";

export function clearQuickExpense(router: ReturnType<typeof useRouter>) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("quick") !== "1") return;
  url.searchParams.delete("quick");
  router.replace(url.pathname + url.search + url.hash, { scroll: false });
}
