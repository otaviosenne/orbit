import { isTouchWeb } from '../../host';
import { MICROPHONE_ICON } from '../../icons';
import type { LevelSource } from '../voice-meter';
import { VoiceMeter } from '../voice-meter';
import type { HandsFreeState } from './hands-free';

const LIVE_TITLE: string = 'Hands-free dictation is on. Click to turn it off';
const PAUSED_TITLE: string = 'Hands-free dictation is paused until a chat is open. Click to turn it off';
const OFF_TITLE: string = 'Hands-free dictation is off. Click to turn it on';
const MUTED_TITLE: string = 'Muted: the mic stays on but only hears “Orbit unmute”. Click to turn it off';

// The top bar's mic, always there: it breathes with your voice while the mode is on, dims while paused, sits faded
// with no background while off, and flips the mode when clicked. A phone, which has the composer's own mic, shows it
// only while the mode is on.
export class HandsFreeIndicator {
  private readonly meter: VoiceMeter;
  private state: HandsFreeState = 'off';
  private isMuted: boolean = false;

  constructor(private readonly button: HTMLButtonElement, private readonly readLevel: LevelSource, toggle: () => void) {
    this.meter = new VoiceMeter(button);
    button.innerHTML = MICROPHONE_ICON;
    button.addEventListener('click', toggle);
  }

  showMuted(muted: boolean): void {
    this.isMuted = muted;
    this.show(this.state);
  }

  show(state: HandsFreeState): void {
    this.state = state;
    const isOn: boolean = state === 'live' || state === 'paused';
    this.button.hidden = !isOn && isTouchWeb();
    // Finishing is the tail of turning off, so it looks off.
    this.button.dataset['state'] = isOn ? state : 'off';
    this.button.dataset['muted'] = String(isOn && this.isMuted);
    this.button.title = isOn && this.isMuted ? MUTED_TITLE : state === 'live' ? LIVE_TITLE : isOn ? PAUSED_TITLE : OFF_TITLE;
    this.button.setAttribute('aria-label', this.button.title);
    if (state === 'live') this.meter.start(this.readLevel);
    else this.meter.stop();
  }
}
