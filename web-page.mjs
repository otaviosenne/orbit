// Orbit Web's page is the desktop index.html plus what a phone browser needs; deriving it keeps one copy of the markup.
const HEAD_ANCHOR = '<meta charset="utf-8" />';
const STYLE_ANCHOR = '<link rel="stylesheet" href="styles.css" />';

const WEB_HEAD = [
  // resizes-content shrinks the page above the on-screen keyboard, so the composer stays in view (Chrome on Android).
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />',
  '<meta name="theme-color" content="#f6f6f8" media="(prefers-color-scheme: light)" />',
  '<meta name="theme-color" content="#1e1e1e" media="(prefers-color-scheme: dark)" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Orbit" />',
  '<link rel="manifest" href="manifest.webmanifest" />',
  '<link rel="icon" href="icon.svg" type="image/svg+xml" />',
  // iOS ignores SVG and manifest icons for the home screen.
  '<link rel="apple-touch-icon" href="icon-180.png" />',
];

// After the desktop sheet, in this order: web.css adapts it to a browser, phone.css lays it out as a phone app.
const WEB_STYLES = ['<link rel="stylesheet" href="web.css" />', '<link rel="stylesheet" href="phone.css" />'];

// Cloudflare overrides the server's no-cache on .js and .css with a browser cache of hours, so a phone would keep
// an old script under a new page; a per-build query makes every release a different URL.
const VERSIONED_ASSETS = [/(href=")(styles\.css|attachments\.css|voice-nav\.css|web\.css|phone\.css)(")/g, /(src=")(app\.js)(")/g];

// The server sends Orbit Web's policy as a header, which also lets the page open its dictation socket. A browser
// enforces every policy it is given, so the desktop page's own (no sockets allowed) must not come along.
const DESKTOP_POLICY = /\s*<meta http-equiv="Content-Security-Policy"[^>]*>/;

export function webPage(desktopHtml, buildVersion) {
  for (const anchor of [HEAD_ANCHOR, STYLE_ANCHOR]) {
    if (!desktopHtml.includes(anchor)) throw new Error(`index.html changed: Orbit Web needs ${anchor}`);
  }
  const page = desktopHtml
    .replace(DESKTOP_POLICY, '')
    .replace(HEAD_ANCHOR, [HEAD_ANCHOR, ...WEB_HEAD].join('\n    '))
    .replace(STYLE_ANCHOR, [STYLE_ANCHOR, ...WEB_STYLES].join('\n    '));
  return VERSIONED_ASSETS.reduce((html, pattern) => html.replace(pattern, `$1$2?v=${buildVersion}$3`), page);
}
