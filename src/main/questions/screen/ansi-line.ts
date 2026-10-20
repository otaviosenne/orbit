// One terminal line read with `kitty @ get-text --ansi`: its plain text, and which characters have a background color.
export interface StyledLine {
  readonly text: string;
  readonly highlighted: readonly boolean[];
}

const ESCAPE: string = '\u001b';
const SGR: RegExp = /^\u001b\[([0-9;:]*)m/;
// Hyperlinks and other OSC sequences carry no visible text.
const OSC: RegExp = /^\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/;
const RESET_CODES: ReadonlySet<string> = new Set(['', '0']);
const BACKGROUND_SET: string = '48';
const BACKGROUND_DEFAULT: string = '49';
// "38;5;n" and "38;2;r;g;b" spread one color over several parameters; those must not be read as codes of their own.
const EXTENDED_COLORS: ReadonlySet<string> = new Set(['38', '48', '58']);
const PALETTE_ARGUMENTS: number = 2;
const RGB_ARGUMENTS: number = 4;
const PALETTE_MODE: string = '5';

export function parseStyledLine(raw: string): StyledLine {
  let text: string = '';
  const highlighted: boolean[] = [];
  let background: boolean = false;
  let rest: string = raw;
  while (rest.length > 0) {
    const sgr: RegExpExecArray | null = SGR.exec(rest);
    const osc: RegExpExecArray | null = sgr === null ? OSC.exec(rest) : null;
    if (sgr !== null) background = applySgr(sgr[1] ?? '', background);
    const skipped: number = sgr?.[0].length ?? osc?.[0].length ?? 0;
    if (skipped > 0) {
      rest = rest.slice(skipped);
      continue;
    }
    const char: string = String.fromCodePoint(rest.codePointAt(0) ?? 0);
    rest = rest.slice(char.length);
    if (char === ESCAPE) continue;
    text += char;
    highlighted.push(...Array.from({ length: char.length }, (): boolean => background));
  }
  return { text, highlighted };
}

export function stripAnsi(raw: string): string {
  return parseStyledLine(raw).text;
}

function applySgr(parameters: string, background: boolean): boolean {
  const codes: string[] = parameters.split(';');
  let state: boolean = background;
  for (let index: number = 0; index < codes.length; index++) {
    const code: string = codes[index] ?? '';
    const base: string = code.split(':')[0] ?? '';
    if (RESET_CODES.has(code)) state = false;
    else if (base === BACKGROUND_SET) state = true;
    else if (code === BACKGROUND_DEFAULT) state = false;
    // Colon forms ("48:2:r:g:b") keep their arguments inside one parameter; semicolon forms spread them out.
    if (EXTENDED_COLORS.has(code)) index += codes[index + 1] === PALETTE_MODE ? PALETTE_ARGUMENTS : RGB_ARGUMENTS;
  }
  return state;
}
