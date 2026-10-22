import type { NumberedMatch } from './phrase-match';
import { gluedStart, numberedStart, phraseStart } from './phrase-match';
import type { Phrase, PhraseRule } from './phrase-table';
import { NUMBER_PREFIXES, PHRASE_RULES } from './phrase-table';
import { isOpenEndedNumberWord } from './spoken-number';
import type { SpokenWord } from './spoken-words';
import { draftBefore, spokenWordsOf } from './spoken-words';
import type { ParseOptions, SpokenCommand } from './voice-command';

const NO_PREFIX: Phrase = [];

// The command the dictated words end with, and the draft left once its phrase is taken off; null when they end with none.
export function parseVoiceCommand(text: string, options: ParseOptions): SpokenCommand | null {
  const words: SpokenWord[] = spokenWordsOf(text);
  return phraseCommand(text, words) ?? numberCommand(text, words, options);
}

function phraseCommand(text: string, words: readonly SpokenWord[]): SpokenCommand | null {
  for (const rule of PHRASE_RULES) {
    const start: number | null = startOfRule(words, rule);
    if (start !== null) return { command: rule.command, remainder: draftBefore(text, start) };
  }
  return null;
}

function startOfRule(words: readonly SpokenWord[], rule: PhraseRule): number | null {
  for (const phrase of rule.phrases) {
    const start: number | null = phraseStart(words, phrase);
    if (start !== null) return start;
  }
  for (const glued of rule.gluedPhrases ?? []) {
    const start: number | null = gluedStart(words, glued);
    if (start !== null) return start;
  }
  return null;
}

function numberCommand(text: string, words: readonly SpokenWord[], options: ParseOptions): SpokenCommand | null {
  for (const prefix of NUMBER_PREFIXES) {
    const match: NumberedMatch | null = numberedStart(words, prefix, isOpenEndedNumberWord);
    if (match !== null && mayAct(match, options)) return chosen(text, match);
  }
  return options.isSelectorOpen ? bareNumberCommand(text, words, options) : null;
}

// Live words still growing might be about to say a bigger number.
function mayAct(match: NumberedMatch, options: ParseOptions): boolean {
  return options.isFinal || !match.canGrow;
}

// Just the number, and nothing else in the draft: a number inside a sentence stays text.
function bareNumberCommand(text: string, words: readonly SpokenWord[], options: ParseOptions): SpokenCommand | null {
  const match: NumberedMatch | null = numberedStart(words, NO_PREFIX, isOpenEndedNumberWord);
  return match !== null && match.leadingWords === 0 && mayAct(match, options) ? chosen(text, match) : null;
}

function chosen(text: string, match: NumberedMatch): SpokenCommand {
  return { command: { action: 'choose', number: match.number }, remainder: draftBefore(text, match.start) };
}
