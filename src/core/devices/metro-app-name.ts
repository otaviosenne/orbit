// A short name for the folder a Metro serves, so two Metros of one repo can be told apart: a git worktree's own name
// (".worktrees/search-phone/apps/mobile" -> "search-phone"), else the folder's last part.
const WORKTREE: RegExp = /\/\.worktrees\/([^/]+)/;

export function metroAppName(folder: string | null): string | null {
  if (folder === null) return null;
  const worktree: string | undefined = WORKTREE.exec(folder)?.[1];
  return worktree ?? (folder.split('/').filter((part: string) => part.length > 0).pop() ?? null);
}
