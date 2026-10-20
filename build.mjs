import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const OUT_DIR = 'dist';
const RENDERER_OUT_DIR = `${OUT_DIR}/renderer`;
const RENDERER_STATIC_FILES = ['index.html', 'styles.css'];
const FONT_FILES = ['inter-latin-wght-normal.woff2'];

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
