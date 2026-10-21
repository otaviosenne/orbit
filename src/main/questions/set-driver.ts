import type { Question, QuestionAnswer } from '../../shared/types';
import { cleanOther } from './answer-plan';
import { clearField, keys, optionDigit, parkAtBottom, rowCount, text } from './picker-keys';
import type { PickerStep } from './picker-keys';
import type { CursorRow } from './screen/picker-evidence';
import { cursorRow, labelMatches, showsPreviewLayout, showsReviewSubmit } from './screen/picker-evidence';

const NO_FIELD: string = 'This question has no field for an answer of your own here';
const NOT_ON_SCREEN: string = 'The question is not on screen in the chat\'s terminal';
const DIFFERENT_QUESTION: string = 'The terminal shows a different question; answer it in the chat window';
// The review step is one more tab after the questions.
const REVIEW_TABS: number = 1;
// Below the options sit at most the field, the multi-select "Next"/"Submit" row and "Chat about this".
const MAX_CLIMB: number = 3;

// What driving the picker needs from the chat's terminal; PickerTerminal provides it over the kitty socket.
export interface PickerIO {
  run(steps: readonly PickerStep[]): Promise<void>;
  plainScreen(): Promise<string>;
}

// Fills in every tab of the picker, tab 1 first, checking the cursor row against the transcript as it goes.
// Works on a terminal too small to show the whole picker: the row under the cursor is always in view.
export class SetDriver {
  constructor(private readonly terminal: PickerIO) {}

  // Returns why it stopped, or null once the picker sits on its review (or sent a lone single choice).
  async answer(questions: readonly Question[], answers: readonly QuestionAnswer[]): Promise<string | null> {
    await this.returnToFirstTab(questions);
    for (const [index, question] of questions.entries()) {
      const problem: string | null = await this.answerTab(question, answers[index] ?? { selected: [], other: null });
      if (problem !== null) return problem;
    }
    return null;
  }

  // Left only changes tab from an option row, which sits a different distance above the bottom in each layout,
  // and the picker keeps a cursor per tab; so each round parks at the bottom and climbs until it reads an option.
  // Left on the first tab does nothing, so the spare rounds are harmless.
  private async returnToFirstTab(questions: readonly Question[]): Promise<void> {
    const rows: number = Math.max(...questions.map(rowCount));
    for (let round: number = 0; round < questions.length + REVIEW_TABS; round++) {
      await this.terminal.run([keys('down', rows)]);
      await this.climbOntoOption(questions);
      await this.terminal.run([keys('left')]);
    }
  }

  private async climbOntoOption(questions: readonly Question[]): Promise<void> {
    for (let step: number = 0; step < MAX_CLIMB; step++) {
      const screen: string = await this.terminal.plainScreen();
      if (showsReviewSubmit(screen) || isSetOption(cursorRow(screen), questions)) return;
      await this.terminal.run([keys('up')]);
    }
  }

  private async answerTab(question: Question, answer: QuestionAnswer): Promise<string | null> {
    const first: CursorRow | string = await this.climbToFirstOption(question);
    if (first === NOT_ON_SCREEN && (await this.climbBlindly(question))) return this.pickOption(answer);
    if (typeof first === 'string') return first;
    if (question.multiSelect) return this.answerMultiSelect(question, answer);
    const other: string | null = cleanOther(answer.other);
    if (other === null) return this.pickOption(answer);
    await this.terminal.run([keys('down', question.options.length)]);
    if (!(await this.isOnField(question))) return NO_FIELD;
    await this.terminal.run([clearField(), text(other), keys('enter')]);
    return null;
  }

  // The rows under the options differ by layout (a wide window draws previews without the field), so the climb
  // from the bottom reads the cursor row instead of counting; Up from option 1 would wrap, so it stops there.
  private async climbToFirstOption(question: Question): Promise<CursorRow | string> {
    await this.terminal.run([parkAtBottom(question)]);
    for (let step: number = 0; step <= rowCount(question); step++) {
      const row: CursorRow | string = await this.cursorOn(question, 0);
      if (typeof row !== 'string') return row;
      await this.terminal.run([keys('up')]);
    }
    return this.cursorOn(question, 0);
  }

  // A number picks the option and moves on; in the preview layout it only moves the cursor there, and Enter picks.
  private async pickOption(answer: QuestionAnswer): Promise<null> {
    const isPreviewLayout: boolean = showsPreviewLayout(await this.terminal.plainScreen());
    await this.terminal.run([text(optionDigit(answer.selected[0] ?? 0)), ...(isPreviewLayout ? [keys('enter')] : [])]);
    return null;
  }

  // A small window draws the preview layout without scrolling to the cursor. That layout has no field, so from the
  // bottom row ("Chat about this") option 1 is exactly one row per option up. Only a single choice is picked this
  // way: boxes cannot be read, so a multi-select is not toggled blind.
  private async climbBlindly(question: Question): Promise<boolean> {
    if (question.multiSelect || !showsPreviewLayout(await this.terminal.plainScreen())) return false;
    await this.terminal.run([parkAtBottom(question), keys('up', question.options.length)]);
    return true;
  }

  // Each box is read before it is pressed, so ticks made earlier in the terminal are kept or undone as needed.
  private async answerMultiSelect(question: Question, answer: QuestionAnswer): Promise<string | null> {
    for (const [index] of question.options.entries()) {
      const row: CursorRow | string = await this.cursorOn(question, index);
      if (typeof row === 'string') return row;
      if (row.ticked !== answer.selected.includes(index)) await this.terminal.run([text(optionDigit(index))]);
      // From the last option this lands on the "Type something" field, or on "Next"/"Submit" where there is none.
      await this.terminal.run([keys('down')]);
    }
    const other: string | null = cleanOther(answer.other);
    if (!(await this.isOnField(question))) {
      if (other !== null) return NO_FIELD;
      await this.terminal.run([keys('enter')]);
      return null;
    }
    // Under the field, the "Next" (or "Submit") row moves the picker on.
    await this.terminal.run([clearField(), ...(other === null ? [] : [text(other)]), keys('down'), keys('enter')]);
    return null;
  }

  // The field is the numbered row right after the options.
  private async isOnField(question: Question): Promise<boolean> {
    return cursorRow(await this.terminal.plainScreen())?.number === question.options.length + 1;
  }

  private async cursorOn(question: Question, index: number): Promise<CursorRow | string> {
    const row: CursorRow | null = cursorRow(await this.terminal.plainScreen());
    if (row === null) return NOT_ON_SCREEN;
    const isExpected: boolean = row.number === index + 1 && labelMatches(row.label, question.options[index]?.label ?? '');
    const hasRightKind: boolean = (row.ticked !== null) === question.multiSelect;
    return isExpected && hasRightKind ? row : DIFFERENT_QUESTION;
  }
}

function isSetOption(row: CursorRow | null, questions: readonly Question[]): boolean {
  return row !== null && questions.some((question: Question) => labelMatches(row.label, question.options[row.number - 1]?.label ?? ''));
}
