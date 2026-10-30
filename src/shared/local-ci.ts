// The monorepo's scripts/ci/local-ci.sh running under a chat: the check that stands in for CI before a merge.
export interface LocalCiRun {
  readonly startedAt: number;
  // What it was started with, such as --integration.
  readonly options: readonly string[];
}
