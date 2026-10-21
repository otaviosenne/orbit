import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';

const INDEX_FILE: string = 'index.html';
const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

// The file a request path names inside root, or null when it would step outside it or has no known type.
export function resolveStaticPath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relative: string = decoded === '/' ? INDEX_FILE : decoded.replace(/^\/+/, '');
  if (relative.includes('\0')) return null;
  const path: string = normalize(join(root, relative));
  if (!path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`)) return null;
  return CONTENT_TYPES[extname(path)] === undefined ? null : path;
}

// The app shell is public (it is open source); every answer is revalidated so an update shows up at once.
export async function serveStatic(response: ServerResponse, root: string, urlPath: string): Promise<boolean> {
  const path: string | null = resolveStaticPath(root, urlPath);
  if (path === null) return false;
  try {
    const body: Buffer = await readFile(path);
    response.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}
