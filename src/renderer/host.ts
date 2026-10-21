// Set by Orbit Web's entry before the app loads; the desktop window never has it.
const HOST_ATTRIBUTE: string = 'host';
const WEB_HOST: string = 'web';
// Below this width Orbit Web is laid out as a phone app (web.css and phone.css use the same breakpoint).
export const PHONE_QUERY: string = '(max-width: 700px)';
// A finger is the main pointer: the keyboard is on screen and there is no hover.
const TOUCH_QUERY: string = '(pointer: coarse)';

export function markWebHost(): void {
  document.documentElement.dataset[HOST_ATTRIBUTE] = WEB_HOST;
}

// Orbit Web hides what only makes sense at the desk: other windows, folder pickers, closing chats, dictation.
export function isWebHost(): boolean {
  return document.documentElement.dataset[HOST_ATTRIBUTE] === WEB_HOST;
}

// Orbit Web on a phone-sized screen; the desktop window never is one, however narrow it gets.
export function isPhoneLayout(): boolean {
  return isWebHost() && window.matchMedia(PHONE_QUERY).matches;
}

// Orbit Web driven by touch, whatever the width: a tablet types on a screen keyboard too.
export function isTouchWeb(): boolean {
  return isWebHost() && window.matchMedia(TOUCH_QUERY).matches;
}
