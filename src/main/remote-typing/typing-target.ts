import type { TypingTarget } from '../../shared/remote-typing';
import { runCommand } from '../run-command';

export interface ActiveWindow {
  readonly class?: string;
  readonly title?: string;
}

// Browsers only, where sign-in pages live. Anything else is refused: a terminal runs the Claude chats (Claude would
// read the text), a messenger would send it with Enter, and Orbit would type into itself.
const BROWSER_APPS: ReadonlySet<string> = new Set(['google-chrome', 'Google-chrome', 'chromium', 'Chromium', 'chromium-browser', 'firefox', 'org.mozilla.firefox', 'brave-browser', 'Brave-browser']);
const REFUSAL: string = 'Orbit types only into a browser window';
const NO_WINDOW: TypingTarget = { title: '', app: '', accepts: false, refusal: 'No window has focus on the PC' };

export async function typingTarget(): Promise<TypingTarget> {
  try {
    return targetOf(JSON.parse(await runCommand('hyprctl', ['activewindow', '-j'])) as ActiveWindow);
  } catch {
    return NO_WINDOW;
  }
}

export function targetOf(active: ActiveWindow): TypingTarget {
  const app: string = active.class ?? '';
  if (app.length === 0) return NO_WINDOW;
  const isBrowser: boolean = BROWSER_APPS.has(app);
  return { title: active.title ?? '', app, accepts: isBrowser, refusal: isBrowser ? null : REFUSAL };
}
