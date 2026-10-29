import { buildVersionIn, shouldReload } from './build-version';

// A phone keeps Orbit Web open for days, as an installed app or a background tab, so it would keep running the
// build it first loaded; it looks for a new one now and then and whenever it comes back into view.
const CHECK_INTERVAL_MS: number = 5 * 60_000;

export function startBuildRefresh(): void {
  const loaded: string | null = buildVersionIn(document.documentElement.outerHTML);
  const check = (): void => void reloadIfStale(loaded);
  document.addEventListener('visibilitychange', (): void => {
    if (document.visibilityState === 'visible') check();
  });
  window.setInterval(check, CHECK_INTERVAL_MS);
}

async function reloadIfStale(loaded: string | null): Promise<void> {
  const served: string | null = await servedBuild();
  if (shouldReload(loaded, served, isWriting())) window.location.reload();
}

// Offline or mid-restart, there is simply nothing to compare with until the next check.
async function servedBuild(): Promise<string | null> {
  try {
    const response: Response = await fetch(new URL('./', window.location.href), { cache: 'no-store' });
    return response.ok ? buildVersionIn(await response.text()) : null;
  } catch {
    return null;
  }
}

function isWriting(): boolean {
  const active: Element | null = document.activeElement;
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return active.value.trim() !== '';
  return active instanceof HTMLElement && active.isContentEditable && (active.textContent ?? '').trim() !== '';
}
