export const PNG_MIME_TYPE: string = 'image/png';

// Magic numbers of the formats an iPhone or a Linux app puts on a clipboard. The body's own bytes decide, since a
// Shortcut's "File" body may come as application/octet-stream or with no type at all.
const PNG_SIGNATURE: Buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE: Buffer = Buffer.from([0xff, 0xd8, 0xff]);
const GIF_SIGNATURE: string = 'GIF8';
const RIFF_SIGNATURE: string = 'RIFF';
const WEBP_TAG: string = 'WEBP';
const WEBP_TAG_OFFSET: number = 8;
const ISO_BOX_TYPE: string = 'ftyp';
const ISO_BOX_TYPE_OFFSET: number = 4;
const ISO_BRAND_OFFSET: number = 8;
const ISO_BRAND_LENGTH: number = 4;
// HEIC/HEIF/AVIF brands: what the iPhone camera, Photos and screenshots write.
const ISO_IMAGE_BRANDS: ReadonlySet<string> = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1', 'avif', 'avis']);

export function isPng(bytes: Buffer): boolean {
  return bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

export function isImage(bytes: Buffer): boolean {
  return isPng(bytes) || bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE) || startsWithText(bytes, 0, GIF_SIGNATURE) || isWebp(bytes) || isIsoImage(bytes);
}

function isWebp(bytes: Buffer): boolean {
  return startsWithText(bytes, 0, RIFF_SIGNATURE) && startsWithText(bytes, WEBP_TAG_OFFSET, WEBP_TAG);
}

function isIsoImage(bytes: Buffer): boolean {
  if (!startsWithText(bytes, ISO_BOX_TYPE_OFFSET, ISO_BOX_TYPE)) return false;
  return ISO_IMAGE_BRANDS.has(bytes.toString('latin1', ISO_BRAND_OFFSET, ISO_BRAND_OFFSET + ISO_BRAND_LENGTH));
}

function startsWithText(bytes: Buffer, offset: number, text: string): boolean {
  return bytes.toString('latin1', offset, offset + text.length) === text;
}
