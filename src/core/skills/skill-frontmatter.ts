const FENCE: string = '---';
const KEY_PATTERN: RegExp = /^([A-Za-z][\w-]*):\s*(.*)$/;
// `>` and `|` (with an optional chomping sign) open a block whose indented lines hold the value.
const BLOCK_SCALAR_PATTERN: RegExp = /^[>|][+-]?$/;
const QUOTED_PATTERN: RegExp = /^(['"])([\s\S]*)\1$/;

export type Frontmatter = ReadonlyMap<string, string>;

// Reads the flat `key: value` header of a SKILL.md. Only what Orbit shows is needed, so nested YAML is
// skipped and every multi-line value is folded onto one line.
export function parseFrontmatter(markdown: string): Frontmatter {
  const lines: string[] = markdown.split(/\r?\n/);
  const fields: Map<string, string> = new Map();
  if (lines[0]?.trim() !== FENCE) return fields;
  let key: string | null = null;
  let parts: string[] = [];
  const flush = (): void => {
    if (key !== null) fields.set(key, unquote(parts.join(' ').trim()));
  };
  for (const line of lines.slice(1)) {
    if (line.trim() === FENCE) break;
    const match: RegExpExecArray | null = isIndented(line) ? null : KEY_PATTERN.exec(line);
    if (match !== null) {
      flush();
      key = match[1] ?? null;
      const value: string = (match[2] ?? '').trim();
      parts = BLOCK_SCALAR_PATTERN.test(value) ? [] : [value];
    } else if (key !== null && line.trim().length > 0) {
      parts.push(line.trim());
    }
  }
  flush();
  return fields;
}

function isIndented(line: string): boolean {
  return line.startsWith(' ') || line.startsWith('\t');
}

function unquote(value: string): string {
  return QUOTED_PATTERN.exec(value)?.[2] ?? value;
}
