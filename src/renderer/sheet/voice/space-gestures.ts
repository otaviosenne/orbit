import { isWebHost } from '../../host';

// Hold Space to talk and double-tap it for hands-free belong to the desktop app. On Orbit Web the composer's mic does
// it, and Space stays a plain key: a phone keyboard's space bar is held to move the caret and tapped twice for a period.
export function usesSpaceGestures(): boolean {
  return !isWebHost();
}
