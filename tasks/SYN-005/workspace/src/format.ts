export function displayName(name: string): string {
  return `User: ${name}`;
}

export function activeLabels(names: string[]): string[] {
  return names.filter((name) => name.length > 0);
}
