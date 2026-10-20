interface CachedElement {
  readonly version: string;
  readonly element: HTMLElement;
}

export interface CacheKeys<T> {
  readonly id: (value: T) => string;
  readonly version: (value: T) => string;
}

// Keeps each value's element between renders, so only new or changed values are built again (markdown is costly).
export class ElementCache<T> {
  private cached: Map<string, CachedElement> = new Map();

  constructor(private readonly keys: CacheKeys<T>, private readonly render: (value: T) => HTMLElement) {}

  // Elements for these values, in order; anything not asked for this time is let go.
  build(values: readonly T[]): HTMLElement[] {
    const next: Map<string, CachedElement> = new Map();
    const elements: HTMLElement[] = values.map((value: T): HTMLElement => {
      const id: string = this.keys.id(value);
      const version: string = this.keys.version(value);
      const hit: CachedElement | undefined = this.cached.get(id);
      const element: HTMLElement = hit !== undefined && hit.version === version && !next.has(id) ? hit.element : this.render(value);
      // A repeated id gets its own element each time; one element cannot sit in two places.
      if (!next.has(id)) next.set(id, { version, element });
      return element;
    });
    this.cached = next;
    return elements;
  }

  clear(): void {
    this.cached.clear();
  }
}
