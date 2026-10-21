// Where words said for a composer that was left finish: they must not overwrite anything typed there since.
export interface KeptDraft {
  text(): string;
  // Only replaces the draft while it still reads expected, so nothing the user wrote since is lost.
  replace(expected: string, next: string): void;
}

// The drafts the side panel keeps for chats that are not on screen.
export interface KeptDrafts {
  text(sessionId: string): string;
  replace(sessionId: string, expected: string, next: string): void;
}

export function keptDraftOf(drafts: KeptDrafts, sessionId: string): KeptDraft {
  return {
    text: (): string => drafts.text(sessionId),
    replace: (expected: string, next: string): void => drafts.replace(sessionId, expected, next),
  };
}
