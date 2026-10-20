import type { RadarApi } from '../shared/types';

declare global {
  interface Window {
    readonly radar: RadarApi;
  }
}
