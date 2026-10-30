import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { webPage } from './web-page.mjs';

const OUT_DIR = 'dist';
const RENDERER_OUT_DIR = `${OUT_DIR}/renderer`;
const RENDERER_STATIC_FILES = ['index.html', 'styles.css', 'attachments.css', 'voice-nav.css'];
const FONT_FILES = ['inter-latin-wght-normal.woff2'];
const WEB_OUT_DIR = `${OUT_DIR}/web`;
// Base 36 keeps the per-build cache-busting version short in Orbit Web's asset URLs.
const BUILD_VERSION_RADIX = 36;
// Copied as [source, name in dist/web].
const WEB_STATIC_FILES = [
  ['src/renderer/styles.css', 'styles.css'],
  ['src/renderer/attachments.css', 'attachments.css'],
  ['src/renderer/voice-nav.css', 'voice-nav.css'],
  ['src/web/web.css', 'web.css'],
  ['src/web/phone.css', 'phone.css'],
  // The phone's tab bar draws these as masks in the tab's color (phone.css).
  ['node_modules/@phosphor-icons/core/assets/fill/kanban-fill.svg', 'tab-board.svg'],
  ['node_modules/@phosphor-icons/core/assets/fill/chart-bar-horizontal-fill.svg', 'tab-timeline.svg'],
  ['node_modules/@phosphor-icons/core/assets/fill/list-bullets-fill.svg', 'tab-list.svg'],
  ['src/web/manifest.webmanifest', 'manifest.webmanifest'],
  ['assets/web/orbit-app-icon.svg', 'icon.svg'],
  ['assets/web/icon-180.png', 'icon-180.png'],
  ['assets/web/icon-192.png', 'icon-192.png'],
  ['assets/web/icon-512.png', 'icon-512.png'],
];

// ws optionally loads native speedups that are not installed; leaving them external lets ws fall back to plain JS.
const nodeTarget = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron', 'bufferutil', 'utf-8-validate'],
  target: 'node22',
};

await build({ ...nodeTarget, entryPoints: ['src/main/main.ts'], outfile: `${OUT_DIR}/main.js` });
await build({ ...nodeTarget, entryPoints: ['src/preload/preload.ts'], outfile: `${OUT_DIR}/preload.js` });
// Orbit's MCP server, which every Claude Code chat starts on its own with plain node (registered as "orbit").
await build({ ...nodeTarget, entryPoints: ['src/mcp/orbit-mcp.ts'], outfile: `${OUT_DIR}/orbit-mcp.js` });
await build({
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'chrome130',
  entryPoints: ['src/renderer/entry.ts'],
  loader: { '.svg': 'text' },
  outfile: `${RENDERER_OUT_DIR}/app.js`,
});

await mkdir(`${RENDERER_OUT_DIR}/fonts`, { recursive: true });
await Promise.all([
  ...RENDERER_STATIC_FILES.map((file) => cp(`src/renderer/${file}`, `${RENDERER_OUT_DIR}/${file}`)),
  ...FONT_FILES.map((file) => cp(`node_modules/@fontsource-variable/inter/files/${file}`, `${RENDERER_OUT_DIR}/fonts/${file}`)),
]);

// Orbit Web: the same renderer with window.radar over HTTP, served by the main process (src/main/remote).
await build({
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['chrome120', 'safari16'],
  entryPoints: ['src/web/entry.ts'],
  loader: { '.svg': 'text' },
  outfile: `${WEB_OUT_DIR}/app.js`,
});
await mkdir(`${WEB_OUT_DIR}/fonts`, { recursive: true });
await Promise.all([
  writeFile(`${WEB_OUT_DIR}/index.html`, webPage(await readFile('src/renderer/index.html', 'utf8'), Date.now().toString(BUILD_VERSION_RADIX))),
  ...WEB_STATIC_FILES.map(([source, name]) => cp(source, `${WEB_OUT_DIR}/${name}`)),
  ...FONT_FILES.map((file) => cp(`node_modules/@fontsource-variable/inter/files/${file}`, `${WEB_OUT_DIR}/fonts/${file}`)),
]);
