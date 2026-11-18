import type { TypingTarget } from '../../shared/remote-typing';
import type { TypingTexts } from '../../shared/typing-request';
import type { ActionResult } from '../../shared/types';
import { runCommand } from '../run-command';
import { failure } from '../terminal-input';
import type { TypingStep } from './typing-plan';
import { typingPlan } from './typing-plan';
import { typingTarget } from './typing-target';

const TYPED: ActionResult = { ok: true, method: null, error: null };

// Types the user's texts into the focused window, Tab between them. Each text goes to wtype on stdin ("-"), so it
// never shows in a process list, and nothing here keeps, logs or echoes it; errors never quote it either. A failure
// halfway leaves the earlier fields filled; the retry types them all again over the same form.
export async function typeOnPc(answer: TypingTexts): Promise<ActionResult> {
  // Checked again at the moment of typing: focus may have moved since the page showed it.
  const target: TypingTarget = await typingTarget();
  if (!target.accepts) return failure(target.refusal ?? 'Orbit does not type into that window');
  try {
    for (const step of typingPlan(answer.texts, answer.pressEnter)) await runStep(step);
    return TYPED;
  } catch {
    return failure('Typing failed on the PC');
  }
}

async function runStep(step: TypingStep): Promise<void> {
  if (step.kind === 'text') await runCommand('wtype', ['-'], step.text);
  else await runCommand('wtype', ['-k', step.key]);
}
