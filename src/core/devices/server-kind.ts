import { isMetroCommand } from './metro-process';

// What a dev server is, from the command that runs it; the first rule that matches names it.
interface KindRule {
  readonly name: string;
  readonly matches: (segments: ReadonlySet<string>) => boolean;
}

const has = (...names: string[]): ((segments: ReadonlySet<string>) => boolean) => (segments: ReadonlySet<string>): boolean => names.some((name: string) => segments.has(name));

const KIND_RULES: readonly KindRule[] = [
  { name: 'Vite', matches: has('vite') },
  { name: 'Next.js', matches: has('next') },
  { name: 'Storybook', matches: has('storybook') },
  { name: 'uvicorn', matches: has('uvicorn') },
  { name: 'gunicorn', matches: has('gunicorn') },
  { name: 'Django', matches: has('manage.py') },
  { name: 'Flask', matches: has('flask') },
  // Podman's and Docker's port forwarders: what listens is a container.
  { name: 'Container', matches: has('rootlessport', 'pasta', 'slirp4netns', 'docker-proxy') },
];
const INTERPRETERS: ReadonlySet<string> = new Set(['node', 'python', 'python3', 'bun', 'deno', 'npm', 'npx', 'pnpm', 'yarn', 'sh', 'bash']);

// "Metro", "Vite", "uvicorn"…; otherwise the program, or the script an interpreter runs ("server.js").
export function serverKind(argv: readonly string[]): string {
  if (isMetroCommand(argv)) return 'Metro';
  const segments: Set<string> = new Set(argv.flatMap((arg: string) => arg.split('/')));
  const rule: KindRule | undefined = KIND_RULES.find((candidate: KindRule) => candidate.matches(segments));
  if (rule !== undefined) return rule.name;
  const program: string = basename(argv[0] ?? '');
  if (!INTERPRETERS.has(program)) return program || 'Server';
  const script: string | undefined = argv.slice(1).find((arg: string) => !arg.startsWith('-'));
  return script === undefined ? program : basename(script);
}

function basename(path: string): string {
  return path.split('/').filter((part: string) => part.length > 0).pop() ?? '';
}
