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

export function webPage(desktopHtml) {
  for (const anchor of [HEAD_ANCHOR, STYLE_ANCHOR]) {
    if (!desktopHtml.includes(anchor)) throw new Error(`index.html changed: Orbit Web needs ${anchor}`);
  }
  return desktopHtml
    .replace(HEAD_ANCHOR, [HEAD_ANCHOR, ...WEB_HEAD].join('\n    '))
    .replace(STYLE_ANCHOR, [STYLE_ANCHOR, ...WEB_STYLES].join('\n    '));
}
