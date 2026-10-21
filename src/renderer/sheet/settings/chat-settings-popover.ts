import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';
import type { CycledPermissionMode } from '../../../shared/permission-modes';
import { PERMISSION_MODE_TITLES } from '../../../shared/permission-modes';
import type { ActionResult, ChatPermissions, ChatSettings, ChatSnapshot } from '../../../shared/types';
import { SLIDERS_ICON } from '../../icons';
import { CloseChatAction } from './close-chat-action';
import type { SectionKey } from './disclosure';
import { choiceLabel, effortLabel } from './model-label';
import type { SettingField } from './pending-settings';
import { PendingSettings } from './pending-settings';
import { PermissionsSection } from './permissions-section';
import { SettingsValues } from './settings-values';
import { SkillsSection } from './skills-section';

// What the popover needs from the panel around it.
export interface SettingsPopoverHost {
  // Puts "/<name> " into the composer for the user to finish; nothing is sent.
  readonly insertSkill: (name: string) => void;
  readonly report: (result: ActionResult, successText: string) => void;
  // Closes the chat the way the board's card menu does: it leaves the board and the panel at once.
  readonly closeChat: (sessionId: string) => void;
}

type SettingSender = (chat: ChatSnapshot) => Promise<ActionResult>;

const UNKNOWN_SETTINGS: ChatSettings = { model: null, effort: null };
const UNKNOWN_PERMISSIONS: ChatPermissions = { mode: null, lockedReason: null };
const ACTIVE_CLASS: string = 'is-active';
// The confirmation floats outside the popover; a click on it must not count as a click elsewhere.
const CONFIRM_SELECTOR: string = '.confirm-popover';

// The header's sliders button and its popover: collapsed Model, Effort, Permissions and Skills rows (one open at a
// time, all closed on every open), and Close chat at the bottom.
export class ChatSettingsPopover {
  private readonly values: SettingsValues = new SettingsValues(
    {
      model: (model: ModelChoice): void => void this.setModel(model),
      effort: (effort: EffortLevel): void => void this.setEffort(effort),
    },
    (key: SectionKey): void => this.toggleSection(key),
  );
  private readonly permissions: PermissionsSection = new PermissionsSection({
    pick: (mode: CycledPermissionMode): void => void this.setPermissionMode(mode),
    openTerminal: (): void => this.openTerminal(),
    toggle: (): void => this.toggleSection('permissions'),
  });
  private readonly skills: SkillsSection = new SkillsSection(
    (name: string): void => this.pickSkill(name),
    (): void => this.toggleSection('skills'),
  );
  private readonly closeAction: CloseChatAction = new CloseChatAction((): void => this.closeChat());
  private expanded: SectionKey | null = null;
  private readonly pending: PendingSettings = new PendingSettings();
  private chat: ChatSnapshot | null = null;
  private polled: ChatSettings = UNKNOWN_SETTINGS;
  private polledPermissions: ChatPermissions = UNKNOWN_PERMISSIONS;
  private isFetching: boolean = false;

  constructor(
    private readonly button: HTMLButtonElement,
    private readonly root: HTMLElement,
    private readonly host: SettingsPopoverHost,
  ) {
    button.innerHTML = SLIDERS_ICON;
    button.addEventListener('click', (): void => this.toggle());
    root.append(
      this.values.model.root,
      this.values.effort.root,
      this.permissions.disclosure.root,
      this.skills.disclosure.root,
      this.closeAction.root,
    );
    document.addEventListener('pointerdown', (event: PointerEvent): void => this.dismissOutside(event), true);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  // Called on every poll with the panel's chat; while open it re-reads the settings, so terminal changes show up.
  follow(chat: ChatSnapshot): void {
    if (chat.sessionId !== this.chat?.sessionId) {
      this.hide();
      this.clearPolled();
    }
    this.chat = chat;
    if (this.isOpen) void this.refresh();
  }

  hide(): void {
    this.closeAction.dismiss();
    this.root.hidden = true;
    this.button.classList.remove(ACTIVE_CLASS);
  }

  // The panel left its chat (closed, or showing a chat still starting): no pick may reach the old one.
  forget(): void {
    this.hide();
    this.chat = null;
    this.clearPolled();
  }

  private toggle(): void {
    if (this.isOpen || this.chat === null) return this.hide();
    this.root.hidden = false;
    this.button.classList.add(ACTIVE_CLASS);
    this.expanded = null;
    this.showExpanded();
    this.showValues();
    void this.refresh();
    void this.skills.load(this.chat.sessionId);
  }

  private toggleSection(key: SectionKey): void {
    this.expanded = this.expanded === key ? null : key;
    this.showExpanded();
    if (this.expanded === 'skills') this.skills.focusSearch();
  }

  private showExpanded(): void {
    this.values.model.setOpen(this.expanded === 'model');
    this.values.effort.setOpen(this.expanded === 'effort');
    this.permissions.disclosure.setOpen(this.expanded === 'permissions');
    this.skills.disclosure.setOpen(this.expanded === 'skills');
  }

  private dismissOutside(event: PointerEvent): void {
    const target: Node = event.target as Node;
    const isInConfirm: boolean = target instanceof Element && target.closest(CONFIRM_SELECTOR) !== null;
    if (this.isOpen && !isInConfirm && !this.root.contains(target) && !this.button.contains(target)) this.hide();
  }

  // Polls overlap when the disk is slow; one read at a time is enough.
  private async refresh(): Promise<void> {
    const chat: ChatSnapshot | null = this.chat;
    if (chat === null || this.isFetching) return;
    this.isFetching = true;
    try {
      const [settings, permissions]: [ChatSettings, ChatPermissions] = await Promise.all([
        window.radar.getChatSettings(chat.sessionId),
        window.radar.getChatPermissions(chat.sessionId),
      ]);
      if (chat.sessionId !== this.chat?.sessionId) return;
      this.polled = settings;
      this.polledPermissions = permissions;
      this.showValues();
    } finally {
      this.isFetching = false;
    }
  }

  private showValues(): void {
    if (this.chat === null) return;
    const now: number = Date.now();
    const settings: ChatSettings = this.pending.apply(this.chat.sessionId, this.polled, now);
    const mode: ChatPermissions['mode'] = this.pending.applyMode(this.chat.sessionId, this.polledPermissions.mode, now);
    // One change at a time across all rows: a slash command and Shift+Tab presses must not interleave.
    const isPending: boolean = this.pending.hasPending(this.chat.sessionId);
    this.values.show(settings, isPending);
    this.permissions.show(mode, this.polledPermissions.lockedReason, isPending);
  }

  private clearPolled(): void {
    this.polled = UNKNOWN_SETTINGS;
    this.polledPermissions = UNKNOWN_PERMISSIONS;
  }

  private setModel(model: ModelChoice): Promise<void> {
    return this.change('model', model, this.polled.model, (chat: ChatSnapshot) => window.radar.setChatModel(chat.pid, model), `Model set to ${choiceLabel(model)}`);
  }

  private setEffort(effort: EffortLevel): Promise<void> {
    return this.change('effort', effort, this.polled.effort, (chat: ChatSnapshot) => window.radar.setChatEffort(chat.pid, effort), `Effort set to ${effortLabel(effort)}`);
  }

  private setPermissionMode(mode: CycledPermissionMode): Promise<void> {
    const send: SettingSender = (chat: ChatSnapshot) => window.radar.setPermissionMode(chat.sessionId, mode);
    return this.change('permissionMode', mode, this.polledPermissions.mode, send, `Permissions set to ${PERMISSION_MODE_TITLES[mode]}`);
  }

  private openTerminal(): void {
    if (this.chat === null) return;
    this.hide();
    void window.radar.focusChat(this.chat.pid);
  }

  // Optimistic like rename and recolor: the pick shows at once and is taken back if the command never arrived.
  private async change(field: SettingField, value: string, before: string | null, send: SettingSender, successText: string): Promise<void> {
    const chat: ChatSnapshot | null = this.chat;
    if (chat === null) return;
    this.pending.set(chat.sessionId, field, value, before, Date.now());
    this.showValues();
    const result: ActionResult = await send(chat);
    if (!result.ok) {
      this.pending.drop(chat.sessionId, field);
      this.showValues();
    }
    this.host.report(result, successText);
  }

  private closeChat(): void {
    const chat: ChatSnapshot | null = this.chat;
    this.hide();
    if (chat !== null) this.host.closeChat(chat.sessionId);
  }

  private pickSkill(name: string): void {
    this.hide();
    this.host.insertSkill(name);
  }
}
