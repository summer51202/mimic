export function formatGeneratedAt(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}
