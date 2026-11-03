import { parseSpokenNumber } from './spoken-number';
import type { Phrase, PhraseRule } from './phrase-table';
import { NUMBER_PREFIXES, PHRASE_RULES } from './phrase-table';
import { WAKE_WORD } from './wake-word';

// What can follow the wake word in a command, as one word: the next word of every "orbit ..." phrase and what follows
// "orbit" in every glued spelling. Dictation glues the name to it ("Arbitmute"); only these are split off, so an
// ordinary word that happens to start like the name ("orbitar", "arbitrary") stays whole.
// Built on first use: wake-word.ts imports this module back, so WAKE_WORD is not there yet while modules load.
let afterWakeWord: ReadonlySet<string> | null = null;

export function canFollowWakeWord(bare: string): boolean {
  afterWakeWord ??= new Set([
    ...[...PHRASE_RULES.flatMap((rule: PhraseRule) => rule.phrases), ...NUMBER_PREFIXES].flatMap(wordAfterWake),
    ...PHRASE_RULES.flatMap((rule: PhraseRule) => rule.gluedPhrases ?? []).flatMap(gluedAfterWake),
  ]);
  return afterWakeWord.has(bare) || parseSpokenNumber([bare]) !== null;
}

function wordAfterWake(phrase: Phrase): string[] {
  const next: string | undefined = phrase[1];
  return phrase[0] === WAKE_WORD && next !== undefined ? [next] : [];
}

function gluedAfterWake(glued: string): string[] {
  return glued.startsWith(WAKE_WORD) && glued.length > WAKE_WORD.length ? [glued.slice(WAKE_WORD.length)] : [];
}
