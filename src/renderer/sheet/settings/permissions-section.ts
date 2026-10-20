import type { CycledPermissionMode, PermissionMode } from '../../../shared/permission-modes';
import { CYCLED_PERMISSION_MODES, PERMISSION_MODE_TITLES, isCycledPermissionMode } from '../../../shared/permission-modes';
import { element } from '../../dom';
import { renderSegmented } from './segmented-choice';

export interface PermissionsActions {
  readonly pick: (mode: CycledPermissionMode) => void;
  // Allow and deny rules are edited in Claude Code's own /permissions screen.
  readonly openTerminal: () => void;
}

const UNKNOWN_MODE: string = 'Not known yet';
const RULES_HINT: string = 'Allow and deny rules: /permissions in the terminal.';

// The chat's permission mode, switched by cycling Shift+Tab in its terminal; rebuilt on every poll.
export class PermissionsSection {
  readonly root: HTMLElement = element('section', 'chat-settings-section chat-settings-permissions');

  constructor(private readonly actions: PermissionsActions) {}

  // lockedReason says why the mode cannot be switched right now (the chat is working, no kitty socket).
  show(mode: PermissionMode | null, lockedReason: string | null, isPending: boolean): void {
    const head: HTMLDivElement = element('div', 'chat-settings-head');
    head.append(element('span', 'chat-settings-title', 'Permissions'), element('span', 'chat-settings-current', mode === null ? UNKNOWN_MODE : PERMISSION_MODE_TITLES[mode]));
    const control: HTMLDivElement = renderSegmented<CycledPermissionMode>({
      options: CYCLED_PERMISSION_MODES,
      current: isCycledPermissionMode(mode) ? mode : null,
      label: (option: CycledPermissionMode): string => PERMISSION_MODE_TITLES[option],
      pick: this.actions.pick,
      isLocked: isPending || lockedReason !== null,
    });
    this.root.replaceChildren(head, control, lockedReason === null ? this.renderRulesHint() : element('p', 'chat-settings-note is-locked', lockedReason));
  }

  private renderRulesHint(): HTMLParagraphElement {
    const hint: HTMLParagraphElement = element('p', 'chat-settings-note', `${RULES_HINT} `);
    const link: HTMLButtonElement = element('button', 'chat-settings-link', 'Go to chat');
    link.type = 'button';
    link.addEventListener('click', this.actions.openTerminal);
    hint.append(link);
    return hint;
  }
}
