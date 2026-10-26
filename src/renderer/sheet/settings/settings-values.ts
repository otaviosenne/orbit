import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';
import { EFFORT_LEVELS, MODEL_CHOICES, SESSION_ONLY_EFFORT, isEffortLevel, modelChoiceOf } from '../../../shared/chat-settings';
import type { ChatSettings } from '../../../shared/types';
import { element } from '../../dom';
import { Disclosure } from './disclosure';
import type { SectionKey } from './disclosure';
import { choiceLabel, effortLabel, modelLabel } from './model-label';
import { renderSegmented } from './segmented-choice';

export interface SettingsPicks {
  readonly model: (model: ModelChoice) => void;
  readonly effort: (effort: EffortLevel) => void;
}

const UNKNOWN_VALUE: string = 'Not known yet';
// Claude Code's typed /model and /effort always save the pick as the default for new chats too.
const SAVES_DEFAULT_NOTE: string = `Claude Code also saves this as the default for new chats (${effortLabel(SESSION_ONLY_EFFORT)} effort stays with this chat).`;

// The Model and Effort rows; their controls are rebuilt on every poll so changes typed in the terminal show up.
export class SettingsValues {
  readonly model: Disclosure;
  readonly effort: Disclosure;

  constructor(private readonly picks: SettingsPicks, toggle: (key: SectionKey) => void) {
    this.model = new Disclosure('Model', (): void => toggle('model'));
    this.effort = new Disclosure('Effort', (): void => toggle('effort'));
  }

  // Locked while a pick is on its way, so picks reach the chat one at a time: once, an /effort sent right after
  // /model was reported delivered but never ran (cause not found; retries worked).
  show(settings: ChatSettings, isLocked: boolean): void {
    this.model.setValue(settings.model === null ? UNKNOWN_VALUE : modelLabel(settings.model));
    this.model.body.replaceChildren(
      renderSegmented<ModelChoice>({
        options: MODEL_CHOICES,
        current: settings.model === null ? null : modelChoiceOf(settings.model),
        label: choiceLabel,
        pick: this.picks.model,
        isLocked,
      }),
      element('p', 'chat-settings-note', SAVES_DEFAULT_NOTE),
    );
    this.effort.setValue(settings.effort === null ? UNKNOWN_VALUE : effortLabel(settings.effort));
    this.effort.body.replaceChildren(
      renderSegmented<EffortLevel>({
        options: EFFORT_LEVELS,
        current: isEffortLevel(settings.effort) ? settings.effort : null,
        label: effortLabel,
        pick: this.picks.effort,
        isLocked,
      }),
      element('p', 'chat-settings-note', SAVES_DEFAULT_NOTE),
    );
  }
}
