// Screenshots of the real app would show someone's private chats; this switch swaps every source for made-up data.
const DEMO_ENV_VAR: string = 'ORBIT_DEMO';
const ENABLED_VALUE: string = '1';

export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[DEMO_ENV_VAR] === ENABLED_VALUE;
}
