import type { DictationState } from '../../dictation';
import { element } from '../../../dom';
import { showVoiceNotice } from '../../../voice-nav/voice-notice';
import type { DictationPlace } from '../dictation-place';
import type { VoiceField } from '../voice-field';

// Words nobody is composing are not kept: the hidden draft is emptied once speech has been quiet this long.
const SCRATCH_CLEAR_MS: number = 4000;

// The field hands-free listens into when no composer is on screen (the Board with the panel closed, the Panel with no
// tile focused), so spoken commands such as "orbit board" or "chat 3" still work. It is never added to the page; it
// only holds the words long enough to see a command at their end.
class CommandField implements VoiceField {
  readonly input: HTMLTextAreaElement = element('textarea', 'command-field');
  readonly mic: HTMLButtonElement = element('button', 'command-field-mic');
  private clearTimer: number | undefined;

  draftChanged(): void {
    window.clearTimeout(this.clearTimer);
    this.clearTimer = window.setTimeout((): void => {
      this.input.value = '';
    }, SCRATCH_CLEAR_MS);
  }

  showState(_state: DictationState): void {}

  showError(message: string): void {
    showVoiceNotice(message);
  }

  mayRefocus(): boolean {
    return false;
  }
}

export function createCommandPlace(): DictationPlace {
  return { target: { kind: 'commands' }, field: new CommandField(), kept: null };
}
