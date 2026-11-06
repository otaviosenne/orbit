// A name a person recognizes in the device list, read from the User-Agent. Order matters: an iPad's Safari also says
// "Mac", Edge also says "Chrome", and every Chrome also says "Safari".
const SYSTEMS: readonly (readonly [RegExp, string])[] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Linux/, 'Linux'],
];
const BROWSERS: readonly (readonly [RegExp, string])[] = [
  [/EdgA?\//, 'Edge'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/OPR\//, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const UNKNOWN_DEVICE: string = 'Unknown browser';

export function deviceNameFrom(userAgent: string | undefined): string {
  if (userAgent === undefined) return UNKNOWN_DEVICE;
  const browser: string | undefined = BROWSERS.find(([pattern]: readonly [RegExp, string]) => pattern.test(userAgent))?.[1];
  const system: string | undefined = SYSTEMS.find(([pattern]: readonly [RegExp, string]) => pattern.test(userAgent))?.[1];
  if (browser === undefined && system === undefined) return UNKNOWN_DEVICE;
  if (browser === undefined) return `Browser on ${system}`;
  return system === undefined ? browser : `${browser} on ${system}`;
}
