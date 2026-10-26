import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';
import type { CycledPermissionMode } from '../../../shared/permission-modes';
import { PERMISSION_MODE_TITLES } from '../../../shared/permission-modes';
import type { ActionResult, ChatPermissions, ChatSettings, ChatSnapshot } from '../../../shared/types';
import { element } from '../../dom';
import { SLIDERS_ICON } from '../../icons';
import { CloseChatAction } from './close-chat-action';
import { SuspendChatAction } from './suspend-chat-action';
import type { SectionKey } from './disclosure';
import { choiceLabel, effortLabel } from './model-label';
import type { SettingField } from './pending-settings';
import { PendingSettings, sameSetting } from './pending-settings';
import { McpSection } from './mcp-section';
import { PermissionsSection } from './permissions-section';
import { ModelSummary } from './model-summary';
import { SettingsValues } from './settings-values';
import { SkillsSection } from './skills-section';

// What the popover needs from the panel around it.
export interface SettingsPopoverHost {
  // Puts "/<name> " into the composer for the user to finish; nothing is sent.
  readonly insertSkill: (name: string) => void;
  readonly report: (result: ActionResult, successText: string) => void;
  // Closes the chat the way the board's card menu does: it leaves the board and the panel at once.
  readonly closeChat: (sessionId: string) => void;
  // Closes it into the board's Suspended section; null where suspending is not offered (Orbit Web, chat windows).
  readonly suspendChat: ((sessionId: string) => void) | null;
}

type SettingSender = (chat: ChatSnapshot) => Promise<ActionResult>;

const UNKNOWN_SETTINGS: ChatSettings = { model: null, effort: null };
const UNKNOWN_PERMISSIONS: ChatPermissions = { mode: null, lockedReason: null };
const ACTIVE_CLASS: string = 'is-active';
// Between two picks sent on close: an /effort typed right after /model was once reported delivered but never ran.
const BETWEEN_PICKS_MS: number = 900;

// Picks made while a settings panel is open, sent when it closes.
interface StagedPicks {
  model?: ModelChoice;
  effort?: EffortLevel;
}
// The confirmation floats outside the popover; a click on it must not count as a click elsewhere.
const CONFIRM_SELECTOR: string = '.confirm-popover';

// The header's sliders button and its popover: collapsed Model, Effort, Permissions, MCPs and Skills rows (one open at a time, all closed
// on every open), and Suspend beside Close chat at the bottom. Model and effort live in the summary under the composer.
export class ChatSettingsPopover {
  // The Model and Effort rows here repeat the summary under the header's buttons, so either place changes them.
  private readonly values: SettingsValues = new SettingsValues(
    {
      model: (model: ModelChoice): void => this.stageModel(model),
      effort: (effort: EffortLevel): void => this.stageEffort(effort),
    },
    (key: SectionKey): void => this.toggleSection(key),
  );
  private readonly summary: ModelSummary;
  private readonly permissions: PermissionsSection = new PermissionsSection({
    pick: (mode: CycledPermissionMode): void => void this.setPermissionMode(mode),
    openTerminal: (): void => this.openTerminal(),
    toggle: (): void => this.toggleSection('permissions'),
  });
  private readonly mcp: McpSection = new McpSection((): void => this.connectMcp(), (): void => this.toggleSection('mcp'));
  private readonly skills: SkillsSection = new SkillsSection(
    (name: string): void => this.pickSkill(name),
    (): void => this.toggleSection('skills'),
  );
  private readonly closeAction: CloseChatAction = new CloseChatAction((): void => this.closeChat());
  private readonly suspendAction: SuspendChatAction | null;
  private expanded: SectionKey | null = null;
  private staged: StagedPicks = {};
  private readonly pending: PendingSettings = new PendingSettings();
  private chat: ChatSnapshot | null = null;
  private polled: ChatSettings = UNKNOWN_SETTINGS;
  private polledPermissions: ChatPermissions = UNKNOWN_PERMISSIONS;
  private isFetching: boolean = false;

  constructor(
    private readonly button: HTMLButtonElement,
    private readonly root: HTMLElement,
    private readonly host: SettingsPopoverHost,
    summaryElements: { readonly button: HTMLButtonElement; readonly root: HTMLElement },
  ) {
    this.summary = new ModelSummary(
      summaryElements.button,
      summaryElements.root,
      { model: (model: ModelChoice): void => this.stageModel(model), effort: (effort: EffortLevel): void => this.stageEffort(effort) },
      (): void => this.hide(),
      (): void => void this.flushStaged(),
    );
    button.innerHTML = SLIDERS_ICON;
    button.addEventListener('click', (): void => this.toggle());
    this.suspendAction = host.suspendChat === null ? null : new SuspendChatAction((): ChatSnapshot | null => this.chat, (): void => this.suspendChat());
    root.append(
      this.values.model.root,
      this.values.effort.root,
      this.permissions.disclosure.root,
      this.mcp.disclosure.root,
      this.skills.disclosure.root,
      this.renderEndActions(),
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
    // Polled even while closed: the summary under the composer always shows the current model and effort.
    void this.refresh();
  }

  hide(): void {
    void this.flushStaged();
    this.closeAction.dismiss();
    this.suspendAction?.dismiss();
    this.root.hidden = true;
    this.button.classList.remove(ACTIVE_CLASS);
  }

  // The panel left its chat (closed, or showing a chat still starting): no pick may reach the old one.
  forget(): void {
    // The chat is gone, so there is nothing to send the picks to.
    this.staged = {};
    this.hide();
    this.summary.clear();
    this.chat = null;
    this.clearPolled();
  }

  // The Close chat confirmation, shown where it always is: inside the open popover.
  askToClose(): void {
    if (this.chat === null) return;
    if (!this.isOpen) this.toggle();
    this.closeAction.ask();
  }

  // Suspend, asking inside the open popover when it would stop work, like Close chat does.
  askToSuspend(): void {
    if (this.chat === null || this.suspendAction === null) return;
    if (!this.isOpen) this.toggle();
    this.suspendAction.ask();
  }

  toggle(): void {
    if (this.isOpen || this.chat === null) return this.hide();
    this.summary.close();
    this.root.hidden = false;
    this.button.classList.add(ACTIVE_CLASS);
    this.expanded = null;
    this.showExpanded();
    this.showValues();
    void this.refresh();
    void this.skills.load(this.chat.sessionId);
    void this.mcp.load(this.chat.sessionId);
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
    this.mcp.disclosure.setOpen(this.expanded === 'mcp');
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
    const settings: ChatSettings = this.withStaged(this.pending.apply(this.chat.sessionId, this.polled, now));
    const mode: ChatPermissions['mode'] = this.pending.applyMode(this.chat.sessionId, this.polledPermissions.mode, now);
    // One change at a time across all rows: a slash command and Shift+Tab presses must not interleave.
    const isPending: boolean = this.pending.hasPending(this.chat.sessionId);
    this.values.show(settings, isPending);
    this.summary.show(settings, isPending);
    this.permissions.show(mode, this.polledPermissions.lockedReason, isPending);
  }

  private clearPolled(): void {
    this.polled = UNKNOWN_SETTINGS;
    this.polledPermissions = UNKNOWN_PERMISSIONS;
    this.summary.clear();
  }

  // A staged pick shows as chosen at once; nothing is locked, since nothing has been sent yet.
  private withStaged(settings: ChatSettings): ChatSettings {
    return { model: this.staged.model ?? settings.model, effort: this.staged.effort ?? settings.effort };
  }

  private stageModel(model: ModelChoice): void {
    this.staged.model = model;
    this.showValues();
  }

  private stageEffort(effort: EffortLevel): void {
    this.staged.effort = effort;
    this.showValues();
  }

  // Sends what was picked, model first, one at a time; a pick equal to what the chat already runs is not sent.
  private async flushStaged(): Promise<void> {
    const picks: StagedPicks = this.staged;
    this.staged = {};
    if (picks.model !== undefined && !this.sameAsPolled('model', picks.model)) await this.setModel(picks.model);
    if (picks.model !== undefined && picks.effort !== undefined) await delay(BETWEEN_PICKS_MS);
    if (picks.effort !== undefined && !this.sameAsPolled('effort', picks.effort)) await this.setEffort(picks.effort);
  }

  private sameAsPolled(field: 'model' | 'effort', value: string): boolean {
    const polled: string | null = this.polled[field];
    return polled !== null && sameSetting(field, polled, value);
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

  // Connecting is done in Claude Code's own /mcp menu, so the chat opens it and the popover steps out of the way.
  private connectMcp(): void {
    const chat: ChatSnapshot | null = this.chat;
    this.hide();
    if (chat !== null) void window.radar.openChatMcp(chat.pid).then((result: ActionResult): void => this.host.report(result, 'MCP menu opened in the chat'));
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

  private suspendChat(): void {
    const chat: ChatSnapshot | null = this.chat;
    this.hide();
    if (chat !== null) this.host.suspendChat?.(chat.sessionId);
  }

  // Both end the chat's process, so they sit apart from the settings, below a divider.
  private renderEndActions(): HTMLElement {
    const row: HTMLDivElement = element('div', 'chat-settings-danger');
    if (this.suspendAction !== null) row.append(this.suspendAction.root);
    row.append(this.closeAction.root);
    return row;
  }

  private pickSkill(name: string): void {
    this.hide();
    this.host.insertSkill(name);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}
