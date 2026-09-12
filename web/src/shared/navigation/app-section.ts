export type AppSection =
  | "/app"
  | "/app/personal"
  | "/app/groups"
  | "/app/tasks"
  | "/app/settings";

const appSections: AppSection[] = [
  "/app/personal",
  "/app/groups",
  "/app/tasks",
  "/app/settings",
  "/app",
];

export function currentAppSection(pathname: string): AppSection | undefined {
  return appSections.find(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  );
}
