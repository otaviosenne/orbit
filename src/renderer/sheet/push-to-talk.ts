const TALK_KEY: string = ' ';
// Longer than a typed space (about 100 ms), short enough that holding feels immediate.
const HOLD_THRESHOLD_MS: number = 220;

export interface PushToTalkHandlers {
  readonly onPress: () => void;
  readonly onHoldStart: () => void;
  readonly onHoldEnd: () => void;
  // pressedAt: when the key went down (performance.now()), for telling a double tap. byNextKey: fast typing pressed
  // the next key before Space came up, so the space must land now, ahead of that key's character.
  readonly onTap: (pressedAt: number, byNextKey: boolean) => void;
}

// Tells a held Space (talk) apart from a tapped Space (type a space) on one input.
export class PushToTalk {
  private holdTimer: number | undefined;
  private isHolding: boolean = false;
  private isPressed: boolean = false;
  // The press already counted as a tap because another key came while Space was down; its release does nothing.
  private isTapped: boolean = false;
  private pressedAt: number = 0;

  constructor(input: HTMLElement, private readonly handlers: PushToTalkHandlers) {
    input.addEventListener('keydown', (event: KeyboardEvent): void => this.handleKeyDown(event));
    input.addEventListener('keyup', (event: KeyboardEvent): void => this.handleKeyUp(event));
    input.addEventListener('blur', (): void => this.release());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== TALK_KEY) return this.handleOtherKey();
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    if (this.isPressed) return;
    this.isPressed = true;
    this.pressedAt = performance.now();
    this.handlers.onPress();
    this.holdTimer = window.setTimeout((): void => {
      this.isHolding = true;
      this.handlers.onHoldStart();
    }, HOLD_THRESHOLD_MS);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key !== TALK_KEY || !this.isPressed) return;
    event.preventDefault();
    const isPendingTap: boolean = !this.isHolding && !this.isTapped;
    this.release();
    if (isPendingTap) this.handlers.onTap(this.pressedAt, false);
  }

  // Typing fast, the next key often goes down before Space comes up. Waiting for the release would type the space
  // after that key's character ("quandoe u"), so the press settles as a tap right here, before the character lands.
  private handleOtherKey(): void {
    if (!this.isPressed || this.isHolding || this.isTapped) return;
    window.clearTimeout(this.holdTimer);
    this.isTapped = true;
    this.handlers.onTap(this.pressedAt, true);
  }

  private release(): void {
    window.clearTimeout(this.holdTimer);
    if (this.isHolding) this.handlers.onHoldEnd();
    this.isHolding = false;
    this.isPressed = false;
    this.isTapped = false;
  }
}
