import type { PickerIO } from '../../src/main/questions/set-driver';
import type { PickerStep } from '../../src/main/questions/picker-keys';
import type { Question } from '../../src/shared/types';

const CLEAR_BEFORE_CARET: string = 'ctrl+u';
const CLEAR_AFTER_CARET: string = 'ctrl+k';

interface TabState {
  cursor: number;
  ticked: number[];
  field: string;
  // A narrow window puts the caret at the start of the field whenever the cursor comes back to it.
  caret: number;
  picked: number | null;
}

// Claude Code's AskUserQuestion picker as observed on 2.1.304–2.1.306, drawn as a terminal too small to show
// more than the cursor's row: Down stops at "Chat about this", Up wraps from option 1 to the field, Left only
// changes tab from an option row, digits only act on option rows, each tab keeps its own cursor.
export class FakePicker implements PickerIO {
  readonly tabs: TabState[];
  tab: number = 0;
  submitted: string[] | null = null;
  // A small window in the preview layout: only the notes and the footer are in view, never the cursor row.
  hidesCursorInPreview: boolean = false;
  readonly typed: string[] = [];

  constructor(private readonly questions: readonly Question[]) {
    this.tabs = questions.map((): TabState => ({ cursor: 0, ticked: [], field: '', caret: 0, picked: null }));
  }

  private get onReview(): boolean {
    return this.tab === this.questions.length;
  }

  private get question(): Question {
    return this.questions[this.tab] as Question;
  }

  private get state(): TabState {
    return this.tabs[this.tab] as TabState;
  }

  private get fieldRow(): number {
    return this.question.options.length;
  }

  private get lastRow(): number {
    return this.fieldRow + (this.question.multiSelect ? 2 : 1);
  }

  async run(steps: readonly PickerStep[]): Promise<void> {
    for (const step of steps) {
      if (step.kind === 'keys') step.keys.forEach((key: string) => this.press(key));
      else this.type(step.text);
    }
  }

  async plainScreen(): Promise<string> {
    if (this.hidesCursorInPreview) return 'Notes: press n to\n add notes\n────\n  Chat about this\n\nEnter to select · ↑/↓ to navigate · n to add\nnotes · Esc to cancel';
    const footer: string = 'Enter to select · Tab/Arrow keys to navigate ·\nEsc to cancel';
    if (this.submitted !== null) return '❯ ';
    if (this.onReview) return `${this.reviewLines()}\nReady to submit your answers?\n\n❯ 1. Submit answers\n  2. Cancel`;
    return `${this.question.question}\n\n${this.cursorLine()}\n────\n${footer}`;
  }

  answers(): string[] {
    return this.questions.map((question: Question, index: number) => this.answerOf(question, this.tabs[index] as TabState));
  }

  private press(key: string): void {
    if (this.submitted !== null) return;
    if (this.onReview) {
      if (key === 'left') this.tab -= 1;
      return;
    }
    const state: TabState = this.state;
    if (key === 'down') state.cursor = Math.min(state.cursor + 1, this.lastRow);
    if (key === 'up') state.cursor = state.cursor === 0 ? this.fieldRow : state.cursor - 1;
    if (key === 'down' || key === 'up') state.caret = 0;
    if (state.cursor === this.fieldRow) this.edit(state, key);
    if (key === 'left' && state.cursor < this.fieldRow) this.tab = Math.max(0, this.tab - 1);
    if (key === 'enter') this.enter();
  }

  private enter(): void {
    const state: TabState = this.state;
    if (!this.question.multiSelect && state.cursor < this.fieldRow) return this.pick(state.cursor);
    if (!this.question.multiSelect && state.cursor === this.fieldRow && state.field.length > 0) return this.pick(null);
    if (this.question.multiSelect && state.cursor === this.fieldRow + 1) this.advance();
  }

  private type(value: string): void {
    this.typed.push(value);
    if (this.submitted !== null) return;
    if (this.onReview) {
      if (value === '1') this.submitted = this.answers();
      return;
    }
    const state: TabState = this.state;
    if (state.cursor === this.fieldRow) {
      state.field = state.field.slice(0, state.caret) + value + state.field.slice(state.caret);
      state.caret += value.length;
      return;
    }
    const digit: number = Number(value) - 1;
    if (state.cursor >= this.fieldRow || !Number.isInteger(digit) || digit < 0 || digit >= this.fieldRow) return;
    if (!this.question.multiSelect) return this.pick(digit);
    state.ticked = state.ticked.includes(digit) ? state.ticked.filter((index: number) => index !== digit) : [...state.ticked, digit];
  }

  private edit(state: TabState, key: string): void {
    if (key === CLEAR_BEFORE_CARET) {
      state.field = state.field.slice(state.caret);
      state.caret = 0;
    }
    if (key === CLEAR_AFTER_CARET) state.field = state.field.slice(0, state.caret);
  }

  private pick(option: number | null): void {
    this.state.picked = option;
    this.advance();
  }

  // A lone single choice is sent at once; otherwise the next tab (or the review) comes up.
  private advance(): void {
    const isLone: boolean = this.questions.length === 1 && !this.question.multiSelect;
    if (isLone) this.submitted = this.answers();
    else this.tab += 1;
  }

  private cursorLine(): string {
    const state: TabState = this.state;
    const option = this.question.options[state.cursor];
    if (option !== undefined) {
      const box: string = this.question.multiSelect ? `[${state.ticked.includes(state.cursor) ? '✔' : ' '}] ` : '';
      return `❯ ${state.cursor + 1}. ${box}${option.label}`;
    }
    if (state.cursor === this.fieldRow) return `❯ ${this.fieldRow + 1}. ${state.field || 'Type something'}`;
    return state.cursor === this.lastRow ? `❯ ${this.fieldRow + 2}. Chat about this` : '❯    Next';
  }

  private reviewLines(): string {
    return this.questions.map((question: Question, index: number) => ` ● ${question.question}\n   → ${this.answerOf(question, this.tabs[index] as TabState)}`).join('\n');
  }

  private answerOf(question: Question, state: TabState): string {
    if (!question.multiSelect) return state.picked === null ? state.field : (question.options[state.picked]?.label ?? '');
    const labels: string[] = state.ticked.map((index: number) => question.options[index]?.label ?? '');
    return [...labels, ...(state.field.length > 0 ? [state.field] : [])].join(', ');
  }
}
