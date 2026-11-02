// The packages that run Metro, the bundler a React Native app on the emulator loads its code from: `expo start`,
// `expo run:android` and `react-native start` all serve it from the same process.
const METRO_PACKAGES: ReadonlySet<string> = new Set(['expo', '@expo', 'react-native', 'metro']);

// Matched by whole path segments, so a project folder such as "my-expo-app" running Vite is not taken for Metro.
export function isMetroCommand(argv: readonly string[]): boolean {
  return argv.some((arg: string) => arg.split('/').some((segment: string) => METRO_PACKAGES.has(segment)));
}
