// Whether hands-free was on when Orbit last ran, so it comes back on after a restart or a reboot. Per window
// profile, in localStorage; anything unreadable counts as off, since an unexpected open mic is the worse mistake.
const STORAGE_KEY: string = 'orbit.hands-free';
const ON: string = 'on';

export function rememberHandsFree(isOn: boolean): void {
  try {
    if (isOn) localStorage.setItem(STORAGE_KEY, ON);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Without storage the mode still works for this run; it just starts off next time.
  }
}

export function wasHandsFreeOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === ON;
  } catch {
    return false;
  }
}
