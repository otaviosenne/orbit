// Finished shells the user closed, by task id; Orbit-side only, nothing in the chat changes.
const STORAGE_KEY: string = 'orbit.dismissed-shells';
// A closed shell drops off by itself minutes later anyway, so only the most recent closes need remembering.
const MAX_REMEMBERED: number = 200;

export class ShellDismissals {
  private readonly ids: string[] = load();

  has(taskId: string): boolean {
    return this.ids.includes(taskId);
  }

  add(taskId: string): void {
    if (this.has(taskId)) return;
    this.ids.push(taskId);
    this.ids.splice(0, Math.max(0, this.ids.length - MAX_REMEMBERED));
    save(this.ids);
  }
}

// Storage can be missing or full; the strip works without it, just without remembering closes across reloads.
function load(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((id: unknown): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function save(ids: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered across reloads; the close still applies now.
  }
}
