// Like Promise.all over a map, but with at most `limit` calls in flight, so hundreds of files never exhaust file handles.
export async function mapLimited<T, R>(items: readonly T[], limit: number, map: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next: number = 0;
  const worker: () => Promise<void> = async (): Promise<void> => {
    while (next < items.length) {
      const index: number = next;
      next += 1;
      results[index] = await map(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
