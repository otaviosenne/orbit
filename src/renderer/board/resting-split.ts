// Active's share of the stack when Active and Idle both have more cards than fit.
const ACTIVE_SHARE: number = 0.6;

export interface RestingHeights {
  readonly active: number;
  readonly idle: number;
}

// How the third column's height is shared: each column gets what it needs while that fits; when both overflow,
// Active takes 60% and Idle 40%; a column needing less than its share gives the rest to the other.
export function restingHeights(available: number, activeNeeds: number, idleNeeds: number): RestingHeights {
  const activeShare: number = available * ACTIVE_SHARE;
  if (activeNeeds + idleNeeds <= available || activeNeeds <= activeShare) return { active: activeNeeds, idle: available - activeNeeds };
  if (idleNeeds <= available - activeShare) return { active: available - idleNeeds, idle: idleNeeds };
  return { active: activeShare, idle: available - activeShare };
}
