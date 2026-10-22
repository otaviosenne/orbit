import { installSheetDismiss } from './sheet-dismiss';
import type { ActionResult, LauncherEntry } from '../shared/types';
import { element } from './dom';
import { isPhoneLayout } from './host';
import { CARET_DOWN_ICON, PLUS_ICON } from './icons';
import type { LaunchListener } from './launch-watch';
import { newChatTarget } from './launch-watch';
import { renderLauncherMenu } from './new-chat/launcher-menu';
import { ShortcutForm } from './new-chat/shortcut-form';
import { actionShortcut } from './shortcuts/shortcut-catalog';
import { shortcutKeysText, withShortcut } from './shortcuts/shortcut-hint';
import { labelOptions } from './voice-nav/voice-number';
import type { VoiceSelector } from './voice-nav/voice-selector';

const LAST_LAUNCHER_KEY: string = 'orbit.lastLauncher';
const CLOSE_KEY: string = 'Escape';
const ITEM_SELECTOR: string = '.new-chat-item';
// Long enough to read "Opening…"; the new chat opens on another workspace, so nothing else shows it started.
const FEEDBACK_MS: number = 1500;

// Top-right "New chat": left click reopens the last project, right click (or the caret) lists every SUPER+D entry.
// On a phone it is one "+" that lists them at once: there is no right click, and no room for the caret.
export class NewChatButton implements VoiceSelector {
  private readonly main: HTMLButtonElement = element('button', 'new-chat-main');
  private readonly label: HTMLSpanElement = element('span', 'new-chat-label', 'New chat');
  private readonly menu: HTMLDivElement = element('div', 'new-chat-menu');
  private readonly form: ShortcutForm = new ShortcutForm(
    { saved: (): void => this.returnToList(), cancel: (): void => this.returnToList() },
    (): readonly string[] => this.entries.map((entry: LauncherEntry) => entry.name),
  );
  private entries: LauncherEntry[] = [];

  constructor(
    root: HTMLElement,
    private readonly launches: LaunchListener,
  ) {
    this.main.type = 'button';
    this.main.innerHTML = PLUS_ICON;
    this.main.append(this.label);
    const more: HTMLButtonElement = element('button', 'new-chat-more');
    more.type = 'button';
    more.title = withShortcut('Choose a project', 'new-chat-menu');
    more.innerHTML = CARET_DOWN_ICON;
    this.menu.hidden = true;
    root.append(this.main, more, this.menu);
    installSheetDismiss(this.menu, (): HTMLElement => this.menu, (): void => this.closeMenu());
    this.main.setAttribute('aria-label', 'New chat');
    this.main.addEventListener('click', (): void => this.press());
    more.addEventListener('click', (): void => void this.toggleMenu());
    root.addEventListener('contextmenu', (event: MouseEvent): void => {
      event.preventDefault();
      // A right click inside the open menu (say, in a form field) must not fold the menu away.
      if (!this.menu.contains(event.target as Node)) void this.toggleMenu();
    });
    document.addEventListener('pointerdown', (event: PointerEvent): void => {
      if (!root.contains(event.target as Node)) this.closeMenu();
    });
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key === CLOSE_KEY) this.closeMenu();
    });
    void this.load();
  }

  get isOpen(): boolean {
    return !this.menu.hidden;
  }

  // Voice: option N of the open menu, counting projects then "Add Shortcut…"; false when it has no such row.
  pick(number: number): boolean {
    const item: HTMLElement | undefined = [...this.menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)][number - 1];
    item?.click();
    return item !== undefined;
  }

  close(): void {
    this.closeMenu();
  }

  // Voice: opens the project menu, whatever state it was in.
  openMenu(): void {
    if (!this.isOpen) void this.toggleMenu();
  }

  // What N does: the same as clicking the button.
  openLast(): void {
    if (!this.main.disabled) void this.open(this.last());
  }

  private press(): void {
    if (isPhoneLayout()) void this.toggleMenu();
    else void this.open(this.last());
  }

  private async load(): Promise<void> {
    this.entries = await window.radar.listLaunchers();
    this.showTarget();
  }

  private last(): string | null {
    const saved: string | null = readLast();
    if (saved !== null && this.entries.some((entry: LauncherEntry) => entry.name === saved)) return saved;
    return this.entries[0]?.name ?? null;
  }

  // The button stays "New chat"; which project it opens is in the tooltip.
  private showTarget(): void {
    const last: string | null = this.last();
    this.label.textContent = 'New chat';
    const allProjects: string = `right-click or ${shortcutKeysText(actionShortcut('new-chat-menu'))} for all projects`;
    this.main.title = last === null ? 'No projects found' : `${withShortcut(`Open a new chat in ${last}`, 'new-chat')}; ${allProjects}`;
  }

  // The watcher is told before launching, so the chat is recognized even if it registers before the launch call returns.
  private async open(name: string | null): Promise<void> {
    const entry: LauncherEntry | undefined = this.entries.find((candidate: LauncherEntry) => candidate.name === name);
    if (entry === undefined) return;
    this.closeMenu();
    writeLast(entry.name);
    this.label.textContent = 'Opening…';
    this.main.disabled = true;
    const launchedAt: number = Date.now();
    this.launches.expect(newChatTarget(entry), launchedAt);
    const result: ActionResult = await window.radar.openLauncher(entry.name);
    if (!result.ok) {
      this.launches.fail(launchedAt, result.error ?? 'Could not open the chat.');
      this.label.textContent = 'Failed';
    }
    window.setTimeout((): void => {
      this.main.disabled = false;
      this.showTarget();
    }, FEEDBACK_MS);
  }

  // Opens at once on the entries already known (over Orbit Web a fetch can take a while), then refreshes them.
  async toggleMenu(): Promise<void> {
    if (!this.menu.hidden) return this.closeMenu();
    this.renderList();
    this.menu.hidden = false;
    await this.showList();
  }

  // Re-reads the list each time, so a project added to ~/.bashrc or a shortcut just saved shows up without restarting.
  // Rows are only rebuilt when the list changed, so a finger already on a row keeps it.
  private async showList(): Promise<void> {
    const before: string = JSON.stringify(this.entries);
    await this.load();
    const changed: boolean = JSON.stringify(this.entries) !== before;
    // The menu may have closed, or turned into the Add Shortcut form, while the list was on its way.
    if (changed && !this.menu.hidden && !this.menu.classList.contains('is-form')) this.renderList();
  }

  private returnToList(): void {
    this.renderList();
    void this.showList();
  }

  private renderList(): void {
    this.menu.classList.remove('is-form');
    this.menu.replaceChildren(
      ...renderLauncherMenu(this.entries, this.last(), {
        open: (name: string): void => void this.open(name),
        addShortcut: (): void => this.showForm(),
      }),
    );
    labelOptions([...this.menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)]);
  }

  private showForm(): void {
    this.menu.classList.add('is-form');
    this.menu.replaceChildren(this.form.root);
    this.form.open();
  }

  private closeMenu(): void {
    this.menu.hidden = true;
  }
}

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_LAUNCHER_KEY);
  } catch {
    return null;
  }
}

function writeLast(name: string): void {
  try {
    localStorage.setItem(LAST_LAUNCHER_KEY, name);
  } catch {
    // The choice just is not remembered.
  }
}
