import { element } from '../dom';
import type { FaqEntry } from './faq';
import { resolveKeyTokens } from './faq-text';
import { highlighted } from './highlight';
import { matchesAllTerms } from './text-search';

// A question as shown, with its answer's keys filled in from the registry.
export interface ShownFaq {
  readonly question: string;
  readonly answer: string;
}

function shown(entry: FaqEntry): ShownFaq {
  return { question: entry.question, answer: resolveKeyTokens(entry.answer) };
}

export function matchingQuestions(entries: readonly FaqEntry[], terms: readonly string[]): readonly ShownFaq[] {
  return entries.map(shown).filter((entry: ShownFaq) => matchesAllTerms(terms, [entry.question, entry.answer]));
}

export function renderQuestionCards(entries: readonly ShownFaq[], terms: readonly string[]): readonly HTMLElement[] {
  return entries.map((entry: ShownFaq): HTMLElement => {
    const card: HTMLElement = element('article', 'help-faq');
    const question: HTMLHeadingElement = element('h4', 'help-faq-question');
    const answer: HTMLParagraphElement = element('p', 'help-faq-answer');
    question.append(...highlighted(entry.question, terms));
    answer.append(...highlighted(entry.answer, terms));
    card.append(question, answer);
    return card;
  });
}
