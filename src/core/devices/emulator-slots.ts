import type { ToolCall } from './tool-calls';

// The android-emulator MCP server addresses emulators by slot ("1", "2") rather than by serial.
export const EMULATOR_MCP_PREFIX: string = 'mcp__android-emulator__';
// Mirrors EMULATOR_SLOTS in ~/Claude/Projects/android-emulator-mcp/src/emulators.ts; used only when the
// transcript never showed the server's own mapping (its list_emulators or launch_emulator output).
const DEFAULT_SLOT_PORTS: ReadonlyMap<string, number> = new Map([
  ['1', 5554],
  ['2', 5556],
]);
// The server acts on slot 1 when a call names no emulator.
const DEFAULT_SLOT: string = '1';

// "1: Pixel 6a 1 — Pixel_6a_1 (emulator-5554) [running]" and "Launching emulator 2 (Pixel 6a 2) on emulator-5556..."
const LISTED_SLOT: RegExp = /^(\d+):.*\(emulator-(\d{4,5})\)/gm;
const LAUNCHED_SLOT: RegExp = /Launching emulator (\d+)\b.*?\bon emulator-(\d{4,5})/g;

export type SlotPorts = ReadonlyMap<string, number>;

// The slot-to-port mapping the server reported in this transcript, latest report winning.
export function learnSlotPorts(calls: readonly ToolCall[]): SlotPorts {
  const learned: Map<string, number> = new Map(DEFAULT_SLOT_PORTS);
  for (const call of calls) {
    if (!call.name.startsWith(EMULATOR_MCP_PREFIX) || call.resultText === null) continue;
    for (const pattern of [LISTED_SLOT, LAUNCHED_SLOT]) {
      for (const match of call.resultText.matchAll(pattern)) learned.set(match[1] ?? '', Number(match[2]));
    }
  }
  return learned;
}

export function slotPort(call: ToolCall, slots: SlotPorts): number | null {
  const slot: unknown = call.input['emulator'];
  return slots.get(typeof slot === 'string' && slot.length > 0 ? slot : DEFAULT_SLOT) ?? null;
}
