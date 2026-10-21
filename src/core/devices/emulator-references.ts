import type { EmulatorReference } from './device-references';
import type { EmulatorTargets } from './emulator-commands';
import { emulatorTargets } from './emulator-commands';
import { EMULATOR_MCP_PREFIX, learnSlotPorts, slotPort } from './emulator-slots';
import type { SlotPorts } from './emulator-slots';
import type { ToolCall } from './tool-calls';

const BASH_TOOL: string = 'Bash';
// MCP tools that act on one emulator; list_emulators reports every slot, so it says nothing about this chat.
const MCP_ACTIONS: ReadonlySet<string> = new Set(['launch_emulator', 'screenshot', 'tap', 'scroll', 'swipe']);
const MCP_CLOSE: string = 'close_emulator';

// Every emulator the chat's own commands and android-emulator calls named, oldest first. Only Bash inputs count:
// a result such as `adb devices` lists every emulator on the machine, not the ones this chat works with.
export function extractEmulatorReferences(calls: readonly ToolCall[]): EmulatorReference[] {
  const slots: SlotPorts = learnSlotPorts(calls);
  let references: EmulatorReference[] = [];
  for (const call of calls) {
    if (call.name === BASH_TOOL) references = applyCommand(references, call);
    else if (call.name.startsWith(EMULATOR_MCP_PREFIX)) references = applyMcpCall(references, call, slots);
  }
  return references;
}

function applyCommand(references: EmulatorReference[], call: ToolCall): EmulatorReference[] {
  const command: unknown = call.input['command'];
  if (typeof command !== 'string') return references;
  const targets: EmulatorTargets = emulatorTargets(command);
  const added: EmulatorReference[] = [
    ...targets.avds.map((launch): EmulatorReference => ({ port: launch.port, avd: launch.avd, at: call.at })),
    ...targets.ports.map((port: number): EmulatorReference => ({ port, avd: null, at: call.at })),
    ...(targets.untargeted ? [{ port: null, avd: null, at: call.at }] : []),
  ];
  return withoutPorts([...references, ...added], targets.closedPorts);
}

function applyMcpCall(references: EmulatorReference[], call: ToolCall, slots: SlotPorts): EmulatorReference[] {
  const tool: string = call.name.slice(EMULATOR_MCP_PREFIX.length);
  const port: number | null = slotPort(call, slots);
  if (port === null) return references;
  if (tool === MCP_CLOSE) return withoutPorts(references, [port]);
  return MCP_ACTIONS.has(tool) ? [...references, { port, avd: null, at: call.at }] : references;
}

// A closed emulator is no longer this chat's, even if another one comes up later on the same port.
function withoutPorts(references: EmulatorReference[], ports: readonly number[]): EmulatorReference[] {
  if (ports.length === 0) return references;
  return references.filter((reference: EmulatorReference) => reference.port === null || !ports.includes(reference.port));
}
