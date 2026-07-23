const unsafePathPart = /(^|\/)(?:\.{1,2})(?:\/|$)|[\\?#]/

export function contentUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '')

  if (normalized.length === 0 || unsafePathPart.test(normalized)) {
    throw new Error('Content path must be a safe origin-relative path')
  }

  return `/content/${normalized
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`
}
