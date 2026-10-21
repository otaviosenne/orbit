const KB: number = 1024;
const MB: number = KB * KB;
const GB: number = KB * MB;
// From here memory reads in GB: four-digit megabytes ("1010 MB") are harder to scan than "1.0 GB".
const GB_FROM_MB: number = 1000;
// Below this a decimal still tells a chat sipping CPU from one that is idle; above it the decimal is noise.
const DECIMAL_CPU_BELOW: number = 10;
const TENTHS: number = 10;
const GB_DECIMALS: number = 1;

export function formatCpuPercent(percent: number): string {
  const shown: number = percent < DECIMAL_CPU_BELOW ? Math.round(percent * TENTHS) / TENTHS : Math.round(percent);
  return `${shown}%`;
}

export function formatMemory(bytes: number): string {
  if (Math.round(bytes / MB) >= GB_FROM_MB) return `${(bytes / GB).toFixed(GB_DECIMALS)} GB`;
  return `${Math.round(bytes / MB)} MB`;
}

export function formatCoreCount(cores: number): string {
  return cores === 1 ? 'of 1 core' : `of ${cores} cores`;
}

export function formatProcessCount(count: number): string {
  return count === 1 ? '1 process' : `${count} processes`;
}
