// A chat launched a moment ago that is not live yet: what the panel can already show while it starts.
// launchedAt identifies the launch, so news about an older one never lands on a newer placeholder.
export interface PendingChat {
  readonly launchedAt: number;
  readonly name: string;
  readonly color: string | null;
}
