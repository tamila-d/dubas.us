import assert from 'node:assert/strict'
import {
  contactFileName,
  createVCard,
} from '../../src/pages/contact-info/vcard.ts'

const vCard = createVCard({
  email: 'art@dubas.us',
  firstName: 'Tamila',
  instagramUrl: 'https://www.instagram.com/tamilaillustrates',
  lastName: 'Dubas',
  organization: 'Tamila Dubas Art',
  phone: '+1 (646) 598-4538',
  photo: {
    base64: 'a'.repeat(180),
    type: 'JPEG',
  },
  role: 'Visual Artist',
  websiteUrl: 'https://dubas.us',
})

assert.match(vCard, /^BEGIN:VCARD\r\nVERSION:3\.0\r\n/)
assert.match(vCard, /\r\nN:Dubas;Tamila;;;\r\n/)
assert.match(vCard, /\r\nEMAIL;TYPE=INTERNET:art@dubas\.us\r\n/)
assert.match(vCard, /\r\nTEL;TYPE=CELL:\+1 \(646\) 598-4538\r\n/)
assert.match(vCard, /\r\nitem1\.URL:https:\/\/dubas\.us\r\n/)
assert.match(vCard, /\r\nitem1\.X-ABLabel:Website\r\n/)
assert.match(
  vCard,
  /\r\nitem2\.URL:https:\/\/www\.instagram\.com\/tamilaillustrates\r\n/,
)
assert.match(vCard, /\r\nitem2\.X-ABLabel:Instagram\r\n/)
assert.doesNotMatch(vCard, /\r\nNOTE[;:]/)
assert.match(vCard, /\r\nPHOTO;ENCODING=b;TYPE=JPEG:/)
assert.match(vCard, /\r\n END:VCARD\r\n$|END:VCARD\r\n$/)
assert.ok(
  vCard
    .split('\r\n')
    .filter(Boolean)
    .every((line) => line.length <= 75),
  'vCard lines must be folded to 75 characters',
)
assert.equal(contactFileName('Tamila', 'Dubas'), 'tamila-dubas.vcf')

console.log('Contact vCard generation passed')
