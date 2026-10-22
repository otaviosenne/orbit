const WEB_TO_SOCKET: Readonly<Record<string, string>> = { 'http:': 'ws:', 'https:': 'wss:' };

// The page may only reach its own server: 'self' for fetch, and the dictation socket spelled out per trusted origin,
// since older Safari does not let 'self' cover ws: and wss:. Built from the settings, never from a request's Host.
export function contentSecurityPolicy(origins: ReadonlySet<string>): string {
  const connect: string = ["'self'", ...[...origins].map(socketOrigin)].join(' ');
  return [
    "default-src 'self'",
    `connect-src ${connect}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // A sent video, audio file or PDF plays from a blob of its bytes, which come through the API, never by a file URL.
    "media-src 'self' blob:",
    "frame-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

function socketOrigin(origin: string): string {
  const url: URL = new URL(origin);
  return `${WEB_TO_SOCKET[url.protocol] ?? url.protocol}//${url.host}`;
}
