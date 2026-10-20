import { delay } from '../run-command';

// How long Claude Code gets to mark the agent stopped after the key went in, checked this often.
const STOP_CONFIRM_TIMEOUT_MS: number = 5000;
const STOP_CONFIRM_POLL_MS: number = 200;

export const STOP_CONFIRM_TIMEOUT_SECONDS: number = STOP_CONFIRM_TIMEOUT_MS / 1000;

export type StopCheck = () => Promise<boolean>;

// The agent's own meta file is the proof: it names exactly the agent that was stopped, by id.
export async function waitUntilStopped(isStopped: StopCheck): Promise<boolean> {
  const deadline: number = Date.now() + STOP_CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isStopped()) return true;
    await delay(STOP_CONFIRM_POLL_MS);
  }
  return false;
}
