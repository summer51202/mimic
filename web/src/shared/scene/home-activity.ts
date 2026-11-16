export function homeActivityStorageKey(context: string) {
  return `mimic.home.latest-recorded.${context}`;
}

export function homeActivityKey(recordedAt: string, id: string) {
  return `${recordedAt}|${id}`;
}

function parseHomeActivityKey(key: string) {
  const [recordedAt, id, extra] = key.split("|");
  const time = Date.parse(recordedAt);
  return id && extra === undefined && Number.isFinite(time) ? { time, id } : null;
}

export function isNewerHomeActivity(activityKey: string, previous: string) {
  const activity = parseHomeActivityKey(activityKey);
  const seen = parseHomeActivityKey(previous);
  return activity !== null && seen !== null &&
    (activity.time > seen.time || (activity.time === seen.time && activity.id > seen.id));
}
