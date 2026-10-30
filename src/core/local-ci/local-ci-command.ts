const SCRIPT_NAME: string = 'local-ci.sh';
// Its shebang runs it as `bash local-ci.sh …`; only a shell running it counts, never `cat local-ci.sh`.
const SHELLS: ReadonlySet<string> = new Set(['bash', 'sh', 'zsh']);

// The options when this command line is the script itself running; null otherwise. A command that only names the
// script (cat local-ci.sh, or the chat's bash -c line that starts it) is not the run.
export function localCiOptions(argv: readonly string[]): string[] | null {
  if (isScript(argv[0])) return argv.slice(1);
  return SHELLS.has(baseName(argv[0] ?? '')) && isScript(argv[1]) ? argv.slice(2) : null;
}

function isScript(argument: string | undefined): boolean {
  return argument !== undefined && baseName(argument) === SCRIPT_NAME;
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}
