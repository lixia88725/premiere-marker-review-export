export function sanitizeFolderName(name) {
  const withoutExtension = String(name || 'Untitled').trim().replace(/\.prproj$/i, '');
  const cleaned = withoutExtension
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Untitled';
}

export function reviewDateStamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + month + day;
}

export function nextReviewFolderName({ projectName, date = new Date(), existingNames = [] }) {
  const base = sanitizeFolderName(projectName) + '_Review_' + reviewDateStamp(date);
  let nextVersion = 1;
  const prefix = base + '_V';
  for (const name of existingNames) {
    const value = String(name);
    if (value.indexOf(prefix) !== 0) continue;
    const version = Number(value.slice(prefix.length));
    if (Number.isFinite(version)) nextVersion = Math.max(nextVersion, version + 1);
  }
  return base + '_V' + nextVersion;
}
