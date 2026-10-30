import { describe, expect, it } from 'vitest';
import { localCiOptions } from '../src/core/local-ci/local-ci-command';

describe('localCiOptions', () => {
  it('recognises the script running, with the options it was given', () => {
    expect(localCiOptions(['bash', 'scripts/ci/local-ci.sh', '--integration'])).toEqual(['--integration']);
    expect(localCiOptions(['/HD/repo/scripts/ci/local-ci.sh'])).toEqual([]);
  });

  it('ignores commands that only name it', () => {
    expect(localCiOptions(['cat', 'scripts/ci/local-ci.sh'])).toBeNull();
    expect(localCiOptions(['/usr/bin/bash', './local-ci.sh', '--staging-deploy'])).toEqual(['--staging-deploy']);
    expect(localCiOptions(['/bin/bash', '-c', 'scripts/ci/local-ci.sh --dry-run'])).toBeNull();
    expect(localCiOptions(['bash', 'scripts/ci/local-ci-report.sh'])).toBeNull();
    expect(localCiOptions([])).toBeNull();
  });
});
