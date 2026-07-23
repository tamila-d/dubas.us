export interface InfoResource {
  schemaVersion: 1
  locale: string
  artist: {
    firstName: string
    lastName: string
    role: string
    handle: string
  }
  images: {
    portrait: string
    signature: string
  }
  links: {
    instagram: string
  }
}

export class InfoResourceValidationError extends Error {
  override name = 'InfoResourceValidationError'
}

function fail(path: string, expectation: string): never {
  throw new InfoResourceValidationError(`${path} must be ${expectation}`)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'an object')
  }
  return value as Record<string, unknown>
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(path, 'a non-empty string')
  }
  return value
}

function imageId(value: unknown, path: string): string {
  const id = string(value, path)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return fail(path, 'a lowercase URL-safe image id')
  }
  return id
}

function httpsUrl(value: unknown, path: string): string {
  const rawUrl = string(value, path)
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return fail(path, 'a valid HTTPS URL')
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return fail(path, 'an HTTPS URL without credentials')
  }
  return url.toString()
}

export function validateInfoResource(value: unknown): InfoResource {
  const input = record(value, 'info')
  if (input.schemaVersion !== 1) {
    return fail('info.schemaVersion', 'schema version 1')
  }
  const artist = record(input.artist, 'info.artist')
  const images = record(input.images, 'info.images')
  const links = record(input.links, 'info.links')

  return {
    schemaVersion: 1,
    locale: string(input.locale, 'info.locale'),
    artist: {
      firstName: string(artist.firstName, 'info.artist.firstName'),
      lastName: string(artist.lastName, 'info.artist.lastName'),
      role: string(artist.role, 'info.artist.role'),
      handle: string(artist.handle, 'info.artist.handle'),
    },
    images: {
      portrait: imageId(images.portrait, 'info.images.portrait'),
      signature: imageId(images.signature, 'info.images.signature'),
    },
    links: {
      instagram: httpsUrl(links.instagram, 'info.links.instagram'),
    },
  }
}
