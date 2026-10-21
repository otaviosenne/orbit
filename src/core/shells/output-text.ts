// Color and cursor codes (CSI) and terminal titles (OSC) mean nothing outside a terminal.
const CSI_SEQUENCE: RegExp = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const OSC_SEQUENCE: RegExp = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;
const LONE_ESCAPE: RegExp = /\u001b./g;
const CARRIAGE_RETURN: string = '\r';

// What a terminal would show: no escape codes, and a line redrawn with \r (a progress bar) keeps only its last draw.
export function cleanOutput(raw: string): string {
  const plain: string = raw.replace(OSC_SEQUENCE, '').replace(CSI_SEQUENCE, '').replace(LONE_ESCAPE, '');
  return plain.split('\n').map(lastDraw).join('\n');
}

function lastDraw(line: string): string {
  const withoutLineEnd: string = line.endsWith(CARRIAGE_RETURN) ? line.slice(0, -CARRIAGE_RETURN.length) : line;
  return withoutLineEnd.slice(withoutLineEnd.lastIndexOf(CARRIAGE_RETURN) + 1);
}
