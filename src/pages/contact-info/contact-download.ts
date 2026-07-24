import { contactFileName, createVCard, type VCardContact } from './vcard'

const base64ChunkSize = 8_192

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += base64ChunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + base64ChunkSize),
    )
  }

  return window.btoa(binary)
}

async function loadPhotoBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Unable to load contact photo: ${response.status}`)
  }
  return arrayBufferToBase64(await response.arrayBuffer())
}

function downloadTextFile(contents: string, fileName: string): void {
  const objectUrl = URL.createObjectURL(
    new Blob([contents], { type: 'text/vcard;charset=utf-8' }),
  )
  const anchor = document.createElement('a')
  anchor.download = fileName
  anchor.href = objectUrl
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}

export async function downloadContact(
  contact: Omit<VCardContact, 'photo'>,
  photoUrl: string,
): Promise<void> {
  const photo = await loadPhotoBase64(photoUrl)
  const vCard = createVCard({
    ...contact,
    photo: {
      base64: photo,
      type: 'JPEG',
    },
  })

  downloadTextFile(
    vCard,
    contactFileName(contact.firstName, contact.lastName),
  )
}
