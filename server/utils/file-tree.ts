export function buildTreeLines(paths: string[]): string[] {
  const sortedPaths = [...paths].sort((left, right) => left.localeCompare(right));
  return sortedPaths.map((path) => `- ${path}`);
}

export function trimSnippet(contents: string, maxLength = 1200): string {
  if (contents.length <= maxLength) {
    return contents;
  }

  return `${contents.slice(0, maxLength)}\n...`;
}
