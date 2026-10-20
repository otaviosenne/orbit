import type { LauncherEntry, Repository } from '../shared/types';
import { DEMO_REPOSITORIES } from './demo-repositories';

function launcher(repository: Repository): LauncherEntry {
  return { name: repository.name, command: `cd ${repository.root} && claude`, chatName: repository.name, folder: repository.root };
}

export function demoLaunchers(): LauncherEntry[] {
  return Object.values(DEMO_REPOSITORIES).map(launcher);
}
