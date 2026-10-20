import type { Repository } from '../shared/types';

const DEMO_CODE_ROOT: string = '/home/demo/code';

function repository(name: string): Repository {
  return { name, root: `${DEMO_CODE_ROOT}/${name}` };
}

export const DEMO_REPOSITORIES = {
  acmeWeb: repository('acme-web'),
  billingApi: repository('billing-api'),
  docsSite: repository('docs-site'),
  mobileApp: repository('mobile-app'),
  infra: repository('infra'),
} as const satisfies Record<string, Repository>;
