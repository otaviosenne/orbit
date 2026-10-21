import type { CycledPermissionMode, PermissionMode } from '../../../shared/permission-modes';
import { CYCLED_PERMISSION_MODES, PERMISSION_MODE_TITLES, isCycledPermissionMode } from '../../../shared/permission-modes';
import { element } from '../../dom';
import { Disclosure } from './disclosure';
import { renderSegmented } from './segmented-choice';

export interface PermissionsActions {
  readonly pick: (mode: CycledPermissionMode) => void;
  // Allow and deny rules are edited in Claude Code's own /permissions screen.
  readonly openTerminal: () => void;
  readonly toggle: () => void;
}

const UNKNOWN_MODE: string = 'Not known yet';
const RULES_HINT: string = 'Allow and deny rules: /permissions in the terminal.';

// The chat's permission mode, switched by cycling Shift+Tab in its terminal; rebuilt on every poll.
export class PermissionsSection {
  readonly disclosure: Disclosure;

  constructor(private readonly actions: PermissionsActions) {
    this.disclosure = new Disclosure('Permissions', actions.toggle);
  }

  // lockedReason says why the mode cannot be switched right now (the chat is working, no kitty socket).
  show(mode: PermissionMode | null, lockedReason: string | null, isPending: boolean): void {
    this.disclosure.setValue(mode === null ? UNKNOWN_MODE : PERMISSION_MODE_TITLES[mode]);
    const control: HTMLDivElement = renderSegmented<CycledPermissionMode>({
      options: CYCLED_PERMISSION_MODES,
      current: isCycledPermissionMode(mode) ? mode : null,
      label: (option: CycledPermissionMode): string => PERMISSION_MODE_TITLES[option],
      pick: this.actions.pick,
      isLocked: isPending || lockedReason !== null,
    });
    const note: HTMLParagraphElement = lockedReason === null ? this.renderRulesHint() : element('p', 'chat-settings-note is-locked', lockedReason);
    this.disclosure.body.replaceChildren(control, note);
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
