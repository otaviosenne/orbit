const MEGABYTE: number = 1024 * 1024;
// base64 carries 3 bytes in 4 characters.
const BASE64_PAYLOAD_RATIO: number = 3 / 4;
// Room in a request for the message text and the JSON around the files.
const REQUEST_HEADROOM_BYTES: number = 1 * MEGABYTE;

// One request from Orbit Web, attachments included as base64. A few phone photos or a short clip fit; a stray huge
// upload is cut off before it fills the desktop's memory (only signed-in requests are read at all).
export const REMOTE_BODY_LIMIT_BYTES: number = 64 * MEGABYTE;

// What the files of one message may weigh, all together, on each side.
export const REMOTE_ATTACHMENTS_LIMIT_BYTES: number = Math.floor(REMOTE_BODY_LIMIT_BYTES * BASE64_PAYLOAD_RATIO) - REQUEST_HEADROOM_BYTES;
// The desktop hands the bytes over IPC in one piece; past this a file is better given to Claude by its own path.
export const DESKTOP_ATTACHMENTS_LIMIT_BYTES: number = 256 * MEGABYTE;

// The viewer receives a file whole (as bytes over IPC, or base64 over HTTP to a phone), so bigger ones only show their path.
export const VIEWER_LIMIT_BYTES: number = 48 * MEGABYTE;

export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / MEGABYTE)} MB`;
}
