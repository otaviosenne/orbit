const TALK_KEY: string = ' ';
// Longer than a typed space (about 100 ms), short enough that holding feels immediate.
const HOLD_THRESHOLD_MS: number = 220;

export interface PushToTalkHandlers {
  readonly onPress: () => void;
  readonly onHoldStart: () => void;
  readonly onHoldEnd: () => void;
  readonly onTap: () => void;
}

// Tells a held Space (talk) apart from a tapped Space (type a space) on one input.
export class PushToTalk {
  private holdTimer: number | undefined;
  private isHolding: boolean = false;
  private isPressed: boolean = false;

  constructor(input: HTMLElement, private readonly handlers: PushToTalkHandlers) {
    input.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKeyDown(event));
    input.addEventListener('keyup', (event: KeyboardEvent): void => this.handleKeyUp(event));
    input.addEventListener('blur', (): void => this.release());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== TALK_KEY || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (this.isPressed) return;
    this.isPressed = true;
    this.handlers.onPress();
    this.holdTimer = window.setTimeout((): void => {
      this.isHolding = true;
      this.handlers.onHoldStart();
    }, HOLD_THRESHOLD_MS);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key !== TALK_KEY || !this.isPressed) return;
    event.preventDefault();
    const wasHolding: boolean = this.isHolding;
    this.release();
    if (!wasHolding) this.handlers.onTap();
  }

  private release(): void {
    window.clearTimeout(this.holdTimer);
    if (this.isHolding) this.handlers.onHoldEnd();
    this.isHolding = false;
    this.isPressed = false;
  }
}
