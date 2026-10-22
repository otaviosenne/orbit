import type { DictationPlace } from './dictation-place';
import type { VoiceSurface } from './place-resolution';
import { resolvePlace } from './place-resolution';

export type PlaceListener = (place: DictationPlace | null) => void;

// Collects what the side panel and the Panel each offer as a hands-free target and passes on the one that counts.
export class DictationRouter {
  private surface: VoiceSurface = 'drawer';
  private drawer: DictationPlace | null = null;
  private tile: DictationPlace | null = null;

  // commands: where words go when neither surface offers a composer, so spoken commands still work.
  constructor(private readonly onPlace: PlaceListener, private readonly commands: DictationPlace) {}

  followDrawer(place: DictationPlace | null): void {
    this.drawer = place;
    this.publish();
  }

  followTile(place: DictationPlace | null): void {
    this.tile = place;
    this.publish();
  }

  showSurface(surface: VoiceSurface): void {
    this.surface = surface;
    this.publish();
  }

  private publish(): void {
    this.onPlace(resolvePlace({ surface: this.surface, drawer: this.drawer, tile: this.tile }) ?? this.commands);
  }
}
