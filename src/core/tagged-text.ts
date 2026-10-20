// Claude Code wraps harness events in XML-like tags inside user records; these read them back out.

export interface TaskNotification {
  readonly status: string | null;
  readonly summary: string | null;
  readonly result: string | null;
}

export function tagValue(text: string, tag: string): string | null {
  const match: RegExpMatchArray | null = text.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() ?? null;
}

export function parseTaskNotification(text: string): TaskNotification | null {
  if (!text.includes('<task-notification>')) return null;
  return { status: tagValue(text, 'status'), summary: tagValue(text, 'summary'), result: tagValue(text, 'result') };
}

// "/color orange" from <command-name>/color</command-name> ... <command-args>orange</command-args>.
export function parseSlashCommand(text: string): string | null {
  const name: string | null = tagValue(text, 'command-name');
  if (name === null) return null;
  return `${name} ${tagValue(text, 'command-args') ?? ''}`.trim();
}
