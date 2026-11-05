// Any CI a chat can be running: a CI script (local-ci.sh and its wrappers such as run-ci-queue.sh), or GitHub's CI
// followed from the terminal, either watched (gh run watch, gh pr checks --watch) or polled in a shell loop.
const SHELLS: ReadonlySet<string> = new Set(['bash', 'sh', 'zsh']);
// "ci" as its own word in a script's name: local-ci.sh, run-ci-batch.sh, ci.sh; never "circle.sh".
const CI_SCRIPT: RegExp = /(^|[-_.])ci([-_.].*)?\.sh$/i;
const LOOP: RegExp = /\b(until|while)\b/;
const GITHUB_CI_CALL: RegExp = /\bgh\s+(run\s+(view|list|watch)|pr\s+checks)\b/;

export function isCiCommand(argv: readonly string[]): boolean {
  return runsCiScript(argv) || watchesGithubCi(argv) || pollsGithubCi(argv);
}

function runsCiScript(argv: readonly string[]): boolean {
  if (isCiScript(argv[0])) return true;
  return SHELLS.has(baseName(argv[0] ?? '')) && isCiScript(argv[1]);
}

function watchesGithubCi(argv: readonly string[]): boolean {
  if (baseName(argv[0] ?? '') !== 'gh') return false;
  const [group, action] = [argv[1], argv[2]];
  return (group === 'run' && action === 'watch') || (group === 'pr' && action === 'checks' && argv.includes('--watch'));
}

// The chat's own `bash -c` line, when it is a loop waiting on a run: between checks only `sleep` runs under it.
function pollsGithubCi(argv: readonly string[]): boolean {
  const script: string | undefined = argv[2];
  return SHELLS.has(baseName(argv[0] ?? '')) && argv[1] === '-c' && script !== undefined && LOOP.test(script) && GITHUB_CI_CALL.test(script);
}

function isCiScript(argument: string | undefined): boolean {
  return argument !== undefined && CI_SCRIPT.test(baseName(argument));
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
