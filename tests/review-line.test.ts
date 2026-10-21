import { describe, expect, it } from 'vitest';
import { parseReviewBody } from '../src/main/questions/screen/review-body';
import { visibleReviewLines } from '../src/main/questions/screen/picker-evidence';

// The second item behind a border and with its answer on the same line, as a real review screen showed it.
const BORDERED_REVIEW: string = [
  'Review your answers',
  '',
  ' ● Como você quer que o ponytail rode sozinho nas sessões do mudbord?',
  '   → Embutir no fluxo (Recommended)',
  ' │ ● Também quer uma auditoria automática periódica para medir se o código está melhorando? → Não',
  '',
  'Ready to submit your answers?',
].join('\n');

describe('review screens with borders and inline answers', () => {
  it('reads each item on its own for the pre-submit check', () => {
    expect(visibleReviewLines(BORDERED_REVIEW)).toEqual([
      { question: 'Como você quer que o ponytail rode sozinho nas sessões do mudbord?', answer: 'Embutir no fluxo (Recommended)' },
      { question: 'Também quer uma auditoria automática periódica para medir se o código está melhorando?', answer: 'Não' },
    ]);
  });

  it('reads each item on its own for the review card', () => {
    expect(parseReviewBody(BORDERED_REVIEW.split('\n'))).toEqual([
      { question: 'Como você quer que o ponytail rode sozinho nas sessões do mudbord?', answer: 'Embutir no fluxo (Recommended)' },
      { question: 'Também quer uma auditoria automática periódica para medir se o código está melhorando?', answer: 'Não' },
    ]);
  });

  it('still joins a wrapped answer under a border', () => {
    const wrapped: string = [' ● Cor?', '   → Azul claro com', ' │   detalhes', ''].join('\n');
    expect(visibleReviewLines(wrapped)).toEqual([{ question: 'Cor?', answer: 'Azul claro com detalhes' }]);
  });
});
