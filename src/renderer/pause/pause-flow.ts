export type EmulatorAnswer = 'close' | 'keep' | 'cancel';

export interface EmulatorApi {
  listOpenEmulators(): Promise<string[]>;
  closeAllEmulators(): Promise<number>;
}

// Asks what to do about the open emulators; each way out of the question is one of the answers.
export type AskAboutEmulators = (labels: readonly string[]) => Promise<EmulatorAnswer>;

// "Pause all chats": the question about emulators comes up only when some are open. The chats are paused first, so
// nothing is still driving an emulator when it goes away.
export async function pauseEverything(pause: { pauseAll(): Promise<void> }, api: EmulatorApi, ask: AskAboutEmulators): Promise<void> {
  const open: string[] = await api.listOpenEmulators().catch((): string[] => []);
  const answer: EmulatorAnswer = open.length === 0 ? 'keep' : await ask(open);
  if (answer === 'cancel') return;
  await pause.pauseAll();
  if (answer === 'close') await api.closeAllEmulators();
}
