interface VCardPhoto {
  base64: string
  type: 'JPEG'
}

export interface VCardContact {
  email: string
  firstName: string
  instagramUrl: string
  lastName: string
  organization: string
  phone: string
  photo?: VCardPhoto
  role: string
  websiteUrl: string
}

function escapeVCardText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
}

function foldLine(line: string): string[] {
  const chunks: string[] = []
  let remainder = line
  let firstLine = true

  while (remainder.length > 0) {
    const limit = firstLine ? 75 : 74
    chunks.push(`${firstLine ? '' : ' '}${remainder.slice(0, limit)}`)
    remainder = remainder.slice(limit)
    firstLine = false
  }

  return chunks.length === 0 ? [''] : chunks
}

export function createVCard(contact: VCardContact): string {
  const displayName = `${contact.firstName} ${contact.lastName}`
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardText(contact.lastName)};${escapeVCardText(contact.firstName)};;;`,
    `FN:${escapeVCardText(displayName)}`,
    `ORG:${escapeVCardText(contact.organization)}`,
    `TITLE:${escapeVCardText(contact.role)}`,
    `EMAIL;TYPE=INTERNET:${contact.email}`,
    `TEL;TYPE=CELL:${contact.phone}`,
    `item1.URL:${contact.websiteUrl}`,
    'item1.X-ABLabel:Website',
    `item2.URL:${contact.instagramUrl}`,
    'item2.X-ABLabel:Instagram',
    ...(contact.photo === undefined
      ? []
      : [
          `PHOTO;ENCODING=b;TYPE=${contact.photo.type}:${contact.photo.base64}`,
        ]),
    'END:VCARD',
  ]

  return `${lines.flatMap(foldLine).join('\r\n')}\r\n`
}

export function contactFileName(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLocaleLowerCase('en')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .concat('.vcf')
}
