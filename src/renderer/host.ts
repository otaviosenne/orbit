// Set by Orbit Web's entry before the app loads; the desktop window never has it.
const HOST_ATTRIBUTE: string = 'host';
const WEB_HOST: string = 'web';

export function markWebHost(): void {
  document.documentElement.dataset[HOST_ATTRIBUTE] = WEB_HOST;
}

// Orbit Web hides what only makes sense at the desk: other windows, folder pickers, closing chats, dictation.
export function isWebHost(): boolean {
  return document.documentElement.dataset[HOST_ATTRIBUTE] === WEB_HOST;
}
