// Every release stamps app.js with its build (`app.js?v=<build>`, see web-page.mjs), so the page that loaded and the
// page the server sends now can be told apart by that stamp alone.
const BUILD_STAMP: RegExp = /app\.js\?v=([a-z0-9]+)/;

export function buildVersionIn(html: string): string | null {
  return BUILD_STAMP.exec(html)?.[1] ?? null;
}

// Reloading needs a newer build and no message being written, which a reload would lose.
export function shouldReload(loaded: string | null, served: string | null, isWriting: boolean): boolean {
  return loaded !== null && served !== null && loaded !== served && !isWriting;
}
