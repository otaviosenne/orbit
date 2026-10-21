import type { DictationLimits } from './dictation-limits';

export type SessionExpired = (session: number) => void;

// Times the live session of one browser: it expires when its audio stops coming (counted from the first chunk, since
// a phone can sit on its microphone prompt for a while) or when it runs too long. Finishing or cancelling ends it.
export class SessionWatch {
  private session: number | null = null;
  private idleTimer: NodeJS.Timeout | undefined;
  private lengthTimer: NodeJS.Timeout | undefined;

  constructor(private readonly limits: Pick<DictationLimits, 'audioIdleMs' | 'maxSessionMs'>, private readonly onExpired: SessionExpired) {}

  get isLive(): boolean {
    return this.session !== null;
  }

  started(session: number): void {
    this.clear();
    this.session = session;
    this.lengthTimer = setTimeout((): void => this.expire(session), this.limits.maxSessionMs);
  }

  heard(session: number): void {
    if (session !== this.session) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout((): void => this.expire(session), this.limits.audioIdleMs);
  }

  ended(session: number): void {
    if (session === this.session) this.clear();
  }

  clear(): void {
    clearTimeout(this.idleTimer);
    clearTimeout(this.lengthTimer);
    this.session = null;
  }

  private expire(session: number): void {
    this.clear();
    this.onExpired(session);
  }
}
