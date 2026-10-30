import type {
  AppStream,
  AudioOutput,
  AudioState,
  DeviceBatteries,
  DiskUsage,
  MediaState,
  ProcessLoad,
  SystemLoad,
  Temperatures,
  TopProcesses,
} from '../../shared/computer';

// Each status-menu script prints one JSON value; these turn that text into Orbit's types, or null when it is
// missing or not what the script is known to print.
type Json = Record<string, unknown>;

const PLAYING: string = 'Playing';
const MEDIA_FIELD_SEPARATOR: string = '\t';

// The script reports only what is in use; the total is the machine's, given by the caller.
export function parseSystemLoad(text: string, ramTotalGb: number): SystemLoad | null {
  const json: Json | null = parseObject(text);
  const cpuPercent: number | null = numberOf(json?.['cpu']);
  const ramGb: number | null = numberOf(json?.['ram']);
  if (cpuPercent === null || ramGb === null) return null;
  return { cpuPercent, ramGb, ramTotalGb, cpuTemperature: numberOf(json?.['temp']) };
}

export function parseTemperatures(text: string): Temperatures | null {
  const temps: Json | null = objectOf(parseObject(text)?.['temps']);
  return temps === null ? null : { cpu: numberOf(temps['cpu']), gpu: numberOf(temps['gpu']), nvme: numberOf(temps['nvme']) };
}

export function parseDisks(text: string): DiskUsage[] {
  return listOf(parseObject(text)?.['disks']).flatMap((disk: Json): DiskUsage[] => {
    const percent: number | null = numberOf(disk['percent']);
    return typeof disk['mount'] === 'string' && percent !== null ? [{ mount: disk['mount'], percent, free: String(disk['free'] ?? '') }] : [];
  });
}

export function parseBatteries(text: string): DeviceBatteries | null {
  const json: Json | null = parseObject(text);
  return json === null ? null : { mouse: numberOf(json['mouse']), headset: numberOf(json['headset']), airpods: numberOf(json['airpods']) };
}

export function parseAudio(text: string): AudioState | null {
  const json: Json | null = parseObject(text);
  const volume: number | null = numberOf(json?.['volume']);
  const max: number | null = numberOf(json?.['max']);
  if (json === null || volume === null || max === null) return null;
  return { volume, max, muted: json['muted'] === true, outputs: listOf(json['sinks']).flatMap(toOutput) };
}

export function parseAppStreams(text: string): AppStream[] {
  return listOf(parseJson(text)).flatMap((stream: Json): AppStream[] => {
    const volume: number | null = numberOf(stream['volume']);
    if (typeof stream['id'] !== 'string' || volume === null) return [];
    const name: string = typeof stream['media'] === 'string' && stream['media'].length > 0 ? `${String(stream['name'])} · ${stream['media']}` : String(stream['name']);
    return [{ id: stream['id'], name, volume, muted: stream['muted'] === true }];
  });
}

export function parseTopProcesses(text: string): TopProcesses | null {
  const json: Json | null = parseObject(text);
  return json === null ? null : { cpu: listOf(json['cpu']).flatMap(toLoad), memory: listOf(json['memory']).flatMap(toLoad) };
}

// The brightness-control.sh cache holds the last level it set; it does not exist until brightness first changes.
export function parseBrightness(text: string | null): number | null {
  return text === null ? null : numberOf(text.trim());
}

export function parseNotificationCount(text: string | null): number | null {
  return text === null ? null : numberOf(text.trim());
}

// playerctl metadata --format "{{status}}\t{{artist}}\t{{title}}"
export function parseMedia(text: string | null): MediaState | null {
  if (text === null || text.trim().length === 0) return null;
  const [status = '', artist = '', title = ''] = text.trim().split(MEDIA_FIELD_SEPARATOR);
  return { playing: status === PLAYING, artist, title };
}

function toOutput(sink: Json): AudioOutput[] {
  return typeof sink['name'] === 'string' ? [{ name: sink['name'], description: String(sink['description'] ?? sink['name']), active: sink['active'] === true }] : [];
}

function toLoad(entry: Json): ProcessLoad[] {
  const value: number | null = numberOf(entry['value']);
  return typeof entry['name'] === 'string' && value !== null ? [{ name: entry['name'], value }] : [];
}

// Scripts print numbers both bare and as strings ("49.4"); an empty string means "none".
function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed: number = Number(value.replace('%', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function parseObject(text: string): Json | null {
  return objectOf(parseJson(text));
}

function objectOf(value: unknown): Json | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : null;
}

function listOf(value: unknown): Json[] {
  return Array.isArray(value) ? value.flatMap((item: unknown): Json[] => (objectOf(item) === null ? [] : [item as Json])) : [];
}
