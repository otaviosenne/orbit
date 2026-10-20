import { app } from 'electron';

const LOCK_RETRY_MS: number = 200;
// The old instance only needs to close its window and workers; give up if it is stuck longer than this.
const LOCK_TIMEOUT_MS: number = 5000;

// Only one radar may run: a new launch asks the running one to quit, waits for the lock, and takes over.
export async function claimSingleInstance(): Promise<boolean> {
  const deadline: number = Date.now() + LOCK_TIMEOUT_MS;
  // Each failed attempt notifies the running instance through 'second-instance', which makes it quit.
  while (!app.requestSingleInstanceLock()) {
    if (Date.now() > deadline) return false;
    await delay(LOCK_RETRY_MS);
  }
  app.on('second-instance', (): void => app.quit());
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}
