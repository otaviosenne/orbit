const BYTES_PER_KB: number = 1024;
const PSS_LINE: RegExp = /^Pss:\s+(\d+)\s+kB$/m;

// The Pss line of /proc/<pid>/smaps_rollup, in bytes.
export function parsePssBytes(smapsRollup: string): number | null {
  const kilobytes: string | undefined = PSS_LINE.exec(smapsRollup)?.[1];
  return kilobytes === undefined ? null : Number(kilobytes) * BYTES_PER_KB;
}
