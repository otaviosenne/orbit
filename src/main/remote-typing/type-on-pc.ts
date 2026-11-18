import type { TypeRequest, TypingTarget } from '../../shared/remote-typing';
import { parseTypeRequest } from '../../shared/remote-typing';
import type { ActionResult } from '../../shared/types';
import { runCommand } from '../run-command';
import { failure } from '../terminal-input';
import { typingTarget } from './typing-target';

const TYPED: ActionResult = { ok: true, method: null, error: null };

// Types the user's text into the focused window. The text goes to wtype on stdin ("-"), so it never shows in a
// process list, and nothing here keeps, logs or echoes it; errors never quote it either.
export async function typeOnPc(request: unknown): Promise<ActionResult> {
  const parsed: TypeRequest | null = parseTypeRequest(request);
  if (parsed === null) return failure('Nothing to type, or text Orbit does not type');
  // Checked again at the moment of typing: focus may have moved since the page showed it.
  const target: TypingTarget = await typingTarget();
  if (!target.accepts) return failure(target.refusal ?? 'Orbit does not type into that window');
  try {
    await runCommand('wtype', ['-'], parsed.text);
    if (parsed.pressEnter) await runCommand('wtype', ['-k', 'Return']);
    return TYPED;
  } catch {
    return failure('Typing failed on the PC');
  }
}
