import { imageTokenPattern } from '../../shared/image-tokens';

const STORAGE_KEY: string = 'orbit.drafts';

// What was typed (and attached) in a chat's composer but not sent yet.
export interface ComposerDraft {
  readonly text: string;
  readonly files: readonly File[];
}

export const EMPTY_DRAFT: ComposerDraft = { text: '', files: [] };

// Keeps each chat's unsent draft while you visit other chats, views or windows. The text also survives a
// restart; images only live in memory, so a stored draft drops their markers instead of leaving dead ones.
export class DraftStore {
  private readonly drafts: Map<string, ComposerDraft> = new Map(
    Object.entries(load()).map(([sessionId, text]: [string, string]): [string, ComposerDraft] => [sessionId, { text, files: [] }]),
  );

  get(sessionId: string): ComposerDraft {
    return this.drafts.get(sessionId) ?? EMPTY_DRAFT;
  }

  // An empty draft (sent or cleared) is forgotten.
  set(sessionId: string, draft: ComposerDraft): void {
    if (isEmpty(draft)) this.drafts.delete(sessionId);
    else this.drafts.set(sessionId, draft);
    save(this.drafts);
  }

  // Late dictated words for a chat that is not on screen; skipped once its draft changed in any other way.
  replaceText(sessionId: string, expected: string, next: string): void {
    const kept: ComposerDraft = this.get(sessionId);
    if (kept.text === expected) this.set(sessionId, { text: next, files: kept.files });
  }
}

function isEmpty(draft: ComposerDraft): boolean {
  return draft.text.trim().length === 0 && draft.files.length === 0;
}

export function storedText(draft: ComposerDraft): string {
  return draft.files.length === 0 ? draft.text : draft.text.replace(imageTokenPattern(), '').replace(/ {2,}/g, ' ').trim();
}

// Storage can be unavailable; then drafts last for this run only.
function load(): Record<string, string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return typeof stored === 'object' && stored !== null ? (stored as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function save(drafts: ReadonlyMap<string, ComposerDraft>): void {
  const texts: Record<string, string> = {};
  for (const [sessionId, draft] of drafts) {
    const text: string = storedText(draft);
    if (text.length > 0) texts[sessionId] = text;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(texts));
  } catch {
    // Not persisted.
  }
}
