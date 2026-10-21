import type { DictationState } from '../dictation';
import type { LevelSource } from '../voice-meter';
import { VoiceVisuals } from '../voice-visuals';

// The parts of a composer that show dictation: the element whose data-dictation styles the mic and caret, the
// box the bars move in (the textarea's offset parent), the text field, and the bars standing in for its caret.
export interface DictationDisplayParts {
  readonly host: HTMLElement;
  readonly box: HTMLElement;
  readonly input: HTMLTextAreaElement;
  readonly bars: HTMLElement;
}

// Shows a composer's dictation state: listening pulses its mic and puts the bars at the caret.
export class DictationDisplay {
  private readonly visuals: VoiceVisuals;

  constructor(private readonly parts: DictationDisplayParts, readLevel: LevelSource) {
    this.visuals = new VoiceVisuals(parts.box, parts.input, parts.bars, readLevel);
  }

  show(state: DictationState): void {
    this.parts.host.dataset['dictation'] = state;
    if (state === 'listening') this.visuals.show();
    else this.visuals.hide();
  }

  // Follows the caret as dictated words push it forward.
  placeBars(): void {
    this.visuals.placeBars();
  }
}

const BAR_COUNT: number = 4;

// The stand-in caret: a few bars that rise with the voice.
export function createVoiceBars(): HTMLElement {
  const bars: HTMLSpanElement = document.createElement('span');
  bars.className = 'voice-bars';
  bars.hidden = true;
  for (let index: number = 0; index < BAR_COUNT; index++) bars.append(document.createElement('i'));
  return bars;
}
