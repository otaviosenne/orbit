// The voice service re-sends the whole current utterance on every update and closes it at a pause;
// the full dictation is every closed utterance plus the one still being spoken.
export class TranscriptAccumulator {
  private readonly settled: string[] = [];
  private current: string = '';

  update(utterance: string): void {
    this.current = utterance;
  }

  endUtterance(): void {
    if (this.current.length > 0) this.settled.push(this.current);
    this.current = '';
  }

  get text(): string {
    return [...this.settled, this.current].filter((part: string) => part.length > 0).join(' ');
  }
}
