import type { MessageRole, NoticeTone, PeerDirection, Question, TranscriptItem } from '../shared/types';
import { minutesBeforeLaunch } from './demo-clock';

export interface DemoTool {
  readonly name: string;
  readonly summary: string;
  readonly input: string;
  // null while the tool is still running, like a live transcript shows it.
  readonly output: string | null;
  readonly isError?: boolean;
}

// Writes a made-up transcript top to bottom; each item gets a unique id and a time counted back from launch.
export class TranscriptBuilder {
  private readonly items: TranscriptItem[] = [];

  constructor(private readonly prefix: string) {}

  user(minutesAgo: number, text: string): this {
    return this.message('user', minutesAgo, text);
  }

  assistant(minutesAgo: number, text: string): this {
    return this.message('assistant', minutesAgo, text);
  }

  tools(minutesAgo: number, tools: readonly DemoTool[]): this {
    for (const tool of tools) {
      this.items.push({ kind: 'tool', ...this.stamp(minutesAgo), ...tool, isError: tool.isError ?? false });
    }
    return this;
  }

  notice(minutesAgo: number, title: string, detail: string | null, tone: NoticeTone = 'info'): this {
    this.items.push({ kind: 'notice', ...this.stamp(minutesAgo), tone, title, detail });
    return this;
  }

  peer(minutesAgo: number, direction: PeerDirection, chat: string, text: string): this {
    this.items.push({ kind: 'peer', ...this.stamp(minutesAgo), direction, chat, text });
    return this;
  }

  answeredQuestion(minutesAgo: number, questions: readonly Question[], answers: readonly string[]): this {
    this.items.push({ kind: 'question', ...this.stamp(minutesAgo), questions, state: 'answered', answers, note: null });
    return this;
  }

  turn(minutesAgo: number, durationMs: number): this {
    this.items.push({ kind: 'turn', ...this.stamp(minutesAgo), durationMs });
    return this;
  }

  build(): TranscriptItem[] {
    return [...this.items];
  }

  private message(role: MessageRole, minutesAgo: number, text: string): this {
    this.items.push({ kind: 'message', ...this.stamp(minutesAgo), role, text, images: [] });
    return this;
  }

  private stamp(minutesAgo: number): { readonly id: string; readonly timestamp: number } {
    return { id: `${this.prefix}-${this.items.length}`, timestamp: minutesBeforeLaunch(minutesAgo) };
  }
}
