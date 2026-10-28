import { chatWindowSessionId } from '../../../shared/chat-window-query';
import { isWebHost } from '../../host';

const OWNER_KEY: string = 'orbit.voice-window';

// Each Orbit window (the hub and every popped-out chat) has its own microphone, but the voice service takes one
// dictation at a time, so two windows listening keep cutting each other off. Only the window focused last listens.
// The windows share localStorage, so the claim lives there and the others hear of it through the storage event.
export class VoiceWindow {
  private readonly id: string = crypto.randomUUID();

  constructor(private readonly onChange: () => void) {}

  // Orbit Web runs one page per browser, with its own dictation; there is nothing to share there.
  get owns(): boolean {
    const owner: string | null | undefined = readOwner();
    return isWebHost() || owner === UNREADABLE || owner === this.id;
  }

  start(): void {
    if (isWebHost()) return;
    window.addEventListener('focus', (): void => this.claim());
    window.addEventListener('storage', (event: StorageEvent): void => this.heard(event));
    window.addEventListener('pagehide', (): void => this.release());
    // The hub opens with Orbit itself; a chat window claims when it gets focus.
    if (isHub() || document.hasFocus()) this.claim();
  }

  private heard(event: StorageEvent): void {
    if (event.key !== OWNER_KEY) return;
    // The listening window closed: the hub takes over, so the voice keeps working without a click.
    if (event.newValue === null && isHub()) return this.claim();
    this.onChange();
  }

  private claim(): void {
    if (readOwner() === this.id) return;
    writeOwner(this.id);
    this.onChange();
  }

  private release(): void {
    if (readOwner() === this.id) writeOwner(null);
  }
}

function isHub(): boolean {
  return chatWindowSessionId(window.location.search) === null;
}

// Storage can be unavailable; then every window counts as the owner, as before there was a rule.
const UNREADABLE: undefined = undefined;

function readOwner(): string | null | undefined {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return UNREADABLE;
  }
}

function writeOwner(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(OWNER_KEY);
    else localStorage.setItem(OWNER_KEY, id);
  } catch {
    // Not shared: each window keeps listening on its own.
  }
}
