import type { EffortLevel, ModelChoice } from '../../../shared/chat-settings';
import { EFFORT_LEVELS, MODEL_CHOICES, SESSION_ONLY_EFFORT, isEffortLevel, modelChoiceOf } from '../../../shared/chat-settings';
import type { ChatSettings } from '../../../shared/types';
import { element } from '../../dom';
import { choiceLabel, effortLabel, modelLabel } from './model-label';
import { renderSegmented } from './segmented-choice';

export interface ModelSummaryPicks {
  readonly model: (model: ModelChoice) => void;
  readonly effort: (effort: EffortLevel) => void;
}

// Claude Code's typed /model and /effort always save the pick as the default for new chats too.
const SAVES_DEFAULT_NOTE: string = `Claude Code also saves this as the default for new chats (${effortLabel(SESSION_ONLY_EFFORT)} effort stays with this chat).`;
const SEPARATOR: string = '·';

// Under the composer: "Sonnet 5.5 · High". Clicking it opens a small popover with only the model and the effort.
export class ModelSummary {
  constructor(
    private readonly button: HTMLButtonElement,
    private readonly popover: HTMLElement,
    private readonly picks: ModelSummaryPicks,
    onOpen: () => void,
  ) {
    button.hidden = true;
    popover.hidden = true;
    button.addEventListener('click', (): void => {
      if (this.isOpen) return this.close();
      onOpen();
      popover.hidden = false;
      button.classList.add('is-active');
    });
    document.addEventListener('pointerdown', (event: PointerEvent): void => this.closeOutside(event), true);
  }

  get isOpen(): boolean {
    return !this.popover.hidden;
  }

  close(): void {
    this.popover.hidden = true;
    this.button.classList.remove('is-active');
  }

  // No chat to speak for (closed, or still starting): nothing to show or change.
  clear(): void {
    this.close();
    this.button.hidden = true;
  }

  show(settings: ChatSettings, isLocked: boolean): void {
    this.button.hidden = settings.model === null && settings.effort === null;
    this.button.replaceChildren(
      element('span', 'model-summary-model', settings.model === null ? 'Model' : modelLabel(settings.model)),
      element('span', 'model-summary-dot', SEPARATOR),
      element('span', 'model-summary-effort', settings.effort === null ? 'Effort' : effortLabel(settings.effort)),
    );
    this.popover.replaceChildren(
      this.renderGroup('Model', renderSegmented<ModelChoice>({
        options: MODEL_CHOICES,
        current: settings.model === null ? null : modelChoiceOf(settings.model),
        label: choiceLabel,
        pick: this.picks.model,
        isLocked,
      })),
      this.renderGroup('Effort', renderSegmented<EffortLevel>({
        options: EFFORT_LEVELS,
        current: isEffortLevel(settings.effort) ? settings.effort : null,
        label: effortLabel,
        pick: this.picks.effort,
        isLocked,
      })),
      element('p', 'chat-settings-note', SAVES_DEFAULT_NOTE),
    );
  }

  private renderGroup(title: string, control: HTMLElement): HTMLElement {
    const group: HTMLDivElement = element('div', 'model-popover-group');
    group.append(element('span', 'chat-settings-title', title), control);
    return group;
  }

  private closeOutside(event: PointerEvent): void {
    const target: Node = event.target as Node;
    if (this.isOpen && !this.popover.contains(target) && !this.button.contains(target)) this.close();
  }
}
