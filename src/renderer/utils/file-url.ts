export function toFileUrl(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  const cleaned = normalized.replace(/^\/+/, '');
  return `local-media://media/${encodeURI(cleaned)}`;
}
