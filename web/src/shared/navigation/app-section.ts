export type AppSection =
  | "/app"
  | "/app/groups"
  | "/app/funds"
  | "/app/settings";

const appSections: AppSection[] = [
  "/app/groups",
  "/app/funds",
  "/app/settings",
  "/app",
];

export function currentAppSection(pathname: string): AppSection | undefined {
  return appSections.find(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
}
