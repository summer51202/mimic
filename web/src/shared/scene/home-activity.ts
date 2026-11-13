export function homeActivityStorageKey(context: string) {
  return `mimic.home.latest-activity.${context}`;
}

export function isNewerHomeActivity(activityKey: string, previous: string) {
  return activityKey > previous;
}
