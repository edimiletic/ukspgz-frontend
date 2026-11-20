export interface PositionAssignment {
  id: string;
  position: number;
  desired: number;
}

export interface PositionMove {
  id: string;
  position: number;
}

export class CrewOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrewOrderError';
  }
}

export const CREW_ORDER_ERROR =
  'Redoslijed nije spremljen. Oslobodite jedno mjesto pa promijenite redoslijed.';

export function maxCrewPosition(role: string): number {
  return role === 'Sudac' || role === 'Pomoćni Sudac' ? 3 : 1;
}

/**
 * Orders position changes so each save leaves every place free.
 * The server rejects a crew when two people share a role and a place,
 * and a full crew of three has no spare place to step through.
 */
export function planPositionMoves(
  assignments: PositionAssignment[],
  maxPosition: number
): PositionMove[] | null {
  if (maxPosition < 1) {
    return null;
  }

  const desired = new Map<string, number>();
  const positionOf = new Map<string, number>();
  const seenDesired = new Set<number>();
  const seenCurrent = new Set<number>();

  for (const assignment of assignments) {
    if (!Number.isInteger(assignment.position) || !Number.isInteger(assignment.desired)) {
      return null;
    }
    if (assignment.desired < 1 || assignment.desired > maxPosition) {
      return null;
    }
    if (seenDesired.has(assignment.desired) || seenCurrent.has(assignment.position)) {
      return null;
    }
    seenDesired.add(assignment.desired);
    seenCurrent.add(assignment.position);
    desired.set(assignment.id, assignment.desired);
    positionOf.set(assignment.id, assignment.position);
  }

  const moves: PositionMove[] = [];
  const occupied = () => new Set(positionOf.values());
  const isFree = (position: number) =>
    position >= 1 && position <= maxPosition && !occupied().has(position);
  const pending = () =>
    [...positionOf.keys()].filter((id) => positionOf.get(id) !== desired.get(id));

  const limit = assignments.length * (maxPosition + 2) + 1;
  for (let step = 0; pending().length && step < limit; step++) {
    const waiting = pending();
    const movable = waiting.find((id) => isFree(desired.get(id)!));
    if (movable) {
      const next = desired.get(movable)!;
      positionOf.set(movable, next);
      moves.push({ id: movable, position: next });
      continue;
    }

    let parkAt = 0;
    for (let position = 1; position <= maxPosition; position++) {
      if (isFree(position)) {
        parkAt = position;
        break;
      }
    }
    if (!parkAt) {
      return null;
    }

    const parked = waiting[0];
    positionOf.set(parked, parkAt);
    moves.push({ id: parked, position: parkAt });
  }

  if (pending().length) {
    return null;
  }
  return moves;
}
