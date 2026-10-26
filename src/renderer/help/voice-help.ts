import { element } from '../dom';
import { SEND_PAUSE_MS } from '../sheet/voice/commands/phrase-table';
import { highlighted } from './highlight';
import { matchesAllTerms } from './text-search';

const MS_PER_SECOND: number = 1000;

export type VoiceHelpGroup = 'Chats' | 'Views' | 'Lists' | 'Write and send' | 'Devices';

const GROUPS: readonly VoiceHelpGroup[] = ['Chats', 'Views', 'Lists', 'Write and send', 'Devices'];

export interface VoiceHelpEntry {
  readonly group: VoiceHelpGroup;
  // What to say, each way as written; they end what you dictate, in any case.
  readonly says: readonly string[];
  readonly does: string;
}

// Every spoken command, as the Voice tab lists it. The phrases themselves live in the command table
// (sheet/voice/commands/phrase-table.ts); keep the two in step when one changes.
export const VOICE_HELP: readonly VoiceHelpEntry[] = [
  { group: 'Chats', says: ['chat 3', 'orbit 3', 'orbit chat 3'], does: 'Open the chat numbered #3 in the panel (the numbers show while the mic is on)' },
  { group: 'Views', says: ['orbit board'], does: 'Board' },
  { group: 'Views', says: ['orbit panel', 'orbit painel'], does: 'Panel' },
  { group: 'Views', says: ['orbit timeline'], does: 'Timeline' },
  { group: 'Views', says: ['orbit list', 'orbit lista'], does: 'List' },
  { group: 'Views', says: ['orbit settings', 'orbit configurações'], does: 'Settings' },
  { group: 'Lists', says: ['orbit new chat', 'orbit novo chat'], does: 'Open the New chat list, with a number beside each project' },
  { group: 'Lists', says: ['orbit resume', 'orbit retomar'], does: 'Open the Resume list, with a number beside each past chat' },
  { group: 'Lists', says: ['3', 'chat 3'], does: 'With a list open: pick option 3' },
  { group: 'Lists', says: ['orbit cancelar', 'orbit fechar', 'orbit voltar'], does: 'Close the open list, or else the side panel' },
  { group: 'Write and send', says: ['chinelo', 'orbit enviar', 'flip', 'flipper'], does: 'Send the message right away' },
  {
    group: 'Write and send',
    says: ['pode enviar', 'pode mandar', 'enviar', 'mandar', 'enviar mensagem', 'mandar mensagem', 'pode enviar mensagem'],
    does: `Send the message after a ${SEND_PAUSE_MS / MS_PER_SECOND} second pause: say it, then stop talking`,
  },
  { group: 'Write and send', says: ['orbit limpar', 'orbit clear'], does: 'Clear the message box' },
  { group: 'Devices', says: ['orbit emulador'], does: "Go to the open chat's emulator (nothing if it has none)" },
  { group: 'Devices', says: ['orbit navegador'], does: "Go to the open chat's browser tab (nothing if it has none)" },
];

// The commands a search keeps: its words may name the group, what the command does or what to say.
export function matchingVoiceCommands(entries: readonly VoiceHelpEntry[], terms: readonly string[]): readonly VoiceHelpEntry[] {
  return entries.filter((entry: VoiceHelpEntry) => matchesAllTerms(terms, [entry.does, entry.group, ...entry.says]));
}

// One card per group, in a fixed order; groups the search emptied are left out.
export function renderVoiceGroups(entries: readonly VoiceHelpEntry[], terms: readonly string[]): readonly HTMLElement[] {
  return GROUPS.flatMap((group: VoiceHelpGroup): HTMLElement[] => {
    const inGroup: readonly VoiceHelpEntry[] = entries.filter((entry: VoiceHelpEntry) => entry.group === group);
    return inGroup.length === 0 ? [] : [renderGroup(group, inGroup, terms)];
  });
}

function renderGroup(group: VoiceHelpGroup, entries: readonly VoiceHelpEntry[], terms: readonly string[]): HTMLElement {
  const section: HTMLElement = element('section', 'help-group');
  const title: HTMLHeadingElement = element('h4', 'help-group-title');
  title.append(...highlighted(group, terms));
  section.append(title, ...entries.map((entry: VoiceHelpEntry) => renderRow(entry, terms)));
  return section;
}

function renderRow(entry: VoiceHelpEntry, terms: readonly string[]): HTMLElement {
  const row: HTMLDivElement = element('div', 'help-row');
  const text: HTMLSpanElement = element('span', 'help-row-text');
  text.append(...highlighted(entry.does, terms));
  const says: HTMLSpanElement = element('span', 'help-says');
  entry.says.forEach((phrase: string, index: number): void => {
    if (index > 0) says.append(element('span', 'help-key-word', 'or'));
    const chip: HTMLElement = element('span', 'help-say');
    chip.append(...highlighted(`“${phrase}”`, terms));
    says.append(chip);
  });
  row.append(text, says);
  return row;
}
