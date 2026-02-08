export function toFileUrl(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  return `file:///${normalized.replace(/^\/+/, '')}`;
}
