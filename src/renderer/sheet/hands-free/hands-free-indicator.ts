import { MICROPHONE_ICON } from '../../icons';
import type { LevelSource } from '../voice-meter';
import { VoiceMeter } from '../voice-meter';
import type { HandsFreeState } from './hands-free';

const LIVE_TITLE: string = 'Hands-free dictation is on. Click to turn it off';
const PAUSED_TITLE: string = 'Hands-free dictation is paused until a chat is open. Click to turn it off';

// The top bar's sign that the mic is always on: it breathes with your voice, dims while paused, and turns the
// mode off when clicked. Absent while the mode is off.
export class HandsFreeIndicator {
  private readonly meter: VoiceMeter;

  constructor(private readonly button: HTMLButtonElement, private readonly readLevel: LevelSource, turnOff: () => void) {
    this.meter = new VoiceMeter(button);
    button.innerHTML = MICROPHONE_ICON;
    button.addEventListener('click', turnOff);
  }

  show(state: HandsFreeState): void {
    const isShown: boolean = state === 'live' || state === 'paused';
    this.button.hidden = !isShown;
    this.button.dataset['state'] = state;
    this.button.title = state === 'live' ? LIVE_TITLE : PAUSED_TITLE;
    this.button.setAttribute('aria-label', this.button.title);
    if (state === 'live') this.meter.start(this.readLevel);
    else this.meter.stop();
  }
}
