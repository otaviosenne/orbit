import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';
import { EFFORT_LEVELS, MODEL_CHOICES, SESSION_ONLY_EFFORT, isEffortLevel, modelChoiceOf } from '../../../shared/chat-settings';
import type { ChatSettings } from '../../../shared/types';
import { element } from '../../dom';
import { choiceLabel, effortLabel, modelLabel } from './model-label';
import { renderSegmented } from './segmented-choice';

export interface SettingsPicks {
  readonly model: (model: ModelChoice) => void;
  readonly effort: (effort: EffortLevel) => void;
}

const UNKNOWN_VALUE: string = 'Not known until the chat replies';
// Claude Code's typed /model and /effort always save the pick as the default for new chats too.
const SAVES_DEFAULT_NOTE: string = `Claude Code also saves these as the default for new chats (${effortLabel(SESSION_ONLY_EFFORT)} effort stays with this chat).`;

// The model and effort rows; rebuilt on every poll so changes typed in the terminal show up too.
export class SettingsValues {
  readonly root: HTMLDivElement = element('div', 'chat-settings-values');

  constructor(private readonly picks: SettingsPicks) {}

  // Locked while a pick is on its way, so picks reach the chat one at a time: once, an /effort sent right after
  // /model was reported delivered but never ran (cause not found; retries worked).
  show(settings: ChatSettings, isLocked: boolean): void {
    this.root.replaceChildren(
      renderRow('Model', settings.model === null ? UNKNOWN_VALUE : modelLabel(settings.model), renderSegmented<ModelChoice>({
        options: MODEL_CHOICES,
        current: settings.model === null ? null : modelChoiceOf(settings.model),
        label: choiceLabel,
        pick: this.picks.model,
        isLocked,
      })),
      renderRow('Effort', settings.effort === null ? UNKNOWN_VALUE : effortLabel(settings.effort), renderSegmented<EffortLevel>({
        options: EFFORT_LEVELS,
        current: isEffortLevel(settings.effort) ? settings.effort : null,
        label: effortLabel,
        pick: this.picks.effort,
        isLocked,
      })),
      element('p', 'chat-settings-note', SAVES_DEFAULT_NOTE),
    );
  }
}

function renderRow(title: string, current: string, control: HTMLElement): HTMLElement {
  const row: HTMLElement = element('section', 'chat-settings-section');
  const head: HTMLDivElement = element('div', 'chat-settings-head');
  head.append(element('span', 'chat-settings-title', title), element('span', 'chat-settings-current', current));
  row.append(head, control);
  return row;
}
