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

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function quickExpenseHref(pathname: string, rawQuery: string): string {
  const spaceMatch = pathname.match(/^\/app\/spaces\/([0-9a-f-]{36})$/i);
  if (spaceMatch && uuid.test(spaceMatch[1])) return `${pathname}?quick=1`;
  const groupMatch = pathname.match(/^\/app\/groups\/([0-9a-f-]{36})$/i);
  if (groupMatch && uuid.test(groupMatch[1])) return `/app?group=${encodeURIComponent(groupMatch[1])}&quick=1`;
  const query = new URLSearchParams(rawQuery);
  if (pathname === '/app/personal') {
    const space = query.get('space');
    return space && uuid.test(space) ? `/app/personal?space=${encodeURIComponent(space)}&quick=1` : '/app/personal?quick=1';
  }
  if (pathname === '/app') {
    const group = query.get('group');
    if (group && uuid.test(group)) return `/app?group=${encodeURIComponent(group)}&quick=1`;
  }
  return '/app?quick=1';
}
