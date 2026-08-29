export function normalizeCepFilePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const withoutFileScheme = trimmed.startsWith('file://')
    ? decodeURIComponent(trimmed.slice('file://'.length))
    : decodeURIComponent(trimmed);

  if (withoutFileScheme === '/') return withoutFileScheme;
  return withoutFileScheme.replace(/\/+$/, '');
}
