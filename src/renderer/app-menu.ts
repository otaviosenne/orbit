import { element } from './dom';
import { BROWSER_ICON, BUG_ICON, CONTINUE_ICON, GITHUB_ICON, PAUSE_ICON, PHONE_ICON, QUESTION_ICON } from './icons';
import { actionShortcut } from './shortcuts/shortcut-catalog';
import { shortcutKeysText } from './shortcuts/shortcut-hint';

const REPOSITORY_URL: string = 'https://github.com/otaviosenne/orbit';
const ISSUES_URL: string = `${REPOSITORY_URL}/issues`;
const OPEN_CLASS: string = 'is-open';
const CLOSE_KEY: string = 'Escape';

// Orbit Web shortcuts, only in the desktop window: a browser already showing Orbit Web needs neither.
export interface AppMenuWeb {
  readonly openInBrowser: () => void;
  readonly pairPhone: () => void;
}

// Quiet the machine: every working chat is told to stop, and told to carry on later.
export interface AppMenuPause {
  readonly pauseAll: () => void;
  readonly continueAll: () => void;
  // The paused chats that are open, which Continue can reach; the item is shown only while there are some.
  readonly pausedCount: () => number;
}

interface AppMenuLink {
  readonly icon: string;
  readonly label: string;
  readonly url: string;
}

const LINKS: readonly AppMenuLink[] = [
  { icon: GITHUB_ICON, label: 'GitHub repository', url: REPOSITORY_URL },
  { icon: BUG_ICON, label: 'Report an issue', url: ISSUES_URL },
];

// Clicking the wordmark drops down Help and links about Orbit itself; the links open in the browser (the
// window sends every link outside).
export function attachAppMenu(trigger: HTMLElement, openHelp: () => void, web: AppMenuWeb | null, pause: AppMenuPause): void {
  const menu: HTMLDivElement = element('div', 'card-menu app-menu');
  const continueItem: HTMLButtonElement = renderAction(CONTINUE_ICON, 'Continue paused chats', pause.continueAll);
  menu.append(renderHelpItem(openHelp), renderAction(PAUSE_ICON, 'Pause all chats', pause.pauseAll), continueItem, ...(web === null ? [] : renderWebItems(web)), ...LINKS.map(renderLink));
  document.body.append(menu);
  trigger.classList.add('has-menu');
  trigger.addEventListener('click', (): void => {
    showPaused(continueItem, pause.pausedCount());
    toggle(menu, trigger);
  });
  document.addEventListener('pointerdown', (event: PointerEvent): void => {
    if (!menu.contains(event.target as Node) && !trigger.contains(event.target as Node)) menu.classList.remove(OPEN_CLASS);
  }, true);
  document.addEventListener('keydown', (event: KeyboardEvent): void => {
    if (event.key === CLOSE_KEY) menu.classList.remove(OPEN_CLASS);
  });
  menu.addEventListener('click', (): void => menu.classList.remove(OPEN_CLASS));
}

// The count rides on the label, so the user sees how many chats a Continue would reach.
function showPaused(item: HTMLButtonElement, count: number): void {
  item.hidden = count === 0;
  const label: HTMLElement | null = item.querySelector('span');
  if (label !== null) label.textContent = `Continue paused chats (${count})`;
}

function toggle(menu: HTMLElement, trigger: HTMLElement): void {
  const box: DOMRect = trigger.getBoundingClientRect();
  menu.style.left = `${box.left}px`;
  menu.style.top = `${box.bottom + MENU_OFFSET_PX}px`;
  menu.classList.toggle(OPEN_CLASS);
}

// A little gap under the wordmark, like the New chat menu.
const MENU_OFFSET_PX: number = 6;

// Shows its key on the right, the way a macOS menu item does.
function renderHelpItem(openHelp: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'card-menu-item app-menu-help');
  button.type = 'button';
  button.innerHTML = QUESTION_ICON;
  button.append(element('span', '', 'Help'), element('kbd', 'app-menu-key', shortcutKeysText(actionShortcut('help'))));
  button.addEventListener('click', openHelp);
  return button;
}

function renderWebItems(web: AppMenuWeb): HTMLButtonElement[] {
  return [renderAction(BROWSER_ICON, 'Open in browser', web.openInBrowser), renderAction(PHONE_ICON, 'Use on your phone', web.pairPhone)];
}

function renderAction(icon: string, label: string, run: () => void): HTMLButtonElement {
  const button: HTMLButtonElement = element('button', 'card-menu-item');
  button.type = 'button';
  button.innerHTML = icon;
  button.append(element('span', '', label));
  button.addEventListener('click', run);
  return button;
}

function renderLink(link: AppMenuLink): HTMLAnchorElement {
  const anchor: HTMLAnchorElement = element('a', 'card-menu-item');
  anchor.href = link.url;
  anchor.target = '_blank';
  anchor.innerHTML = link.icon;
  anchor.append(element('span', '', link.label));
  return anchor;
}
