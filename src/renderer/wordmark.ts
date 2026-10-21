import { element } from './dom';
import { ORBIT_O, ORBIT_SPARK } from './icons';

// "Orbit": the O is two crossing orbits and the dot of the i is a spark; the letters follow the theme.
export function renderWordmark(container: HTMLElement): void {
  const orbitO: HTMLSpanElement = element('span', 'wordmark-o');
  orbitO.innerHTML = ORBIT_O;
  const spark: HTMLSpanElement = element('span', 'wordmark-spark');
  spark.innerHTML = ORBIT_SPARK;
  // A dotless i, so the spark can take the dot's place.
  const letterI: HTMLSpanElement = element('span', 'wordmark-i', 'ı');
  letterI.append(spark);
  const word: HTMLSpanElement = element('span', 'wordmark');
  word.setAttribute('aria-label', 'Orbit');
  word.append(orbitO, document.createTextNode('rb'), letterI, document.createTextNode('t'));
  // In front of whatever else sits in the title (the hands-free mic indicator).
  container.prepend(word);
}
