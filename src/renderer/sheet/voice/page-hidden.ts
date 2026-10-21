// A locked or backgrounded phone suspends the page's scripts and microphone without warning; acting on the way out
// keeps the words heard so far and never leaves a socket streaming silence.
export function onPageHidden(listener: () => void): void {
  document.addEventListener('visibilitychange', (): void => {
    if (document.visibilityState === 'hidden') listener();
  });
  window.addEventListener('pagehide', listener);
}
