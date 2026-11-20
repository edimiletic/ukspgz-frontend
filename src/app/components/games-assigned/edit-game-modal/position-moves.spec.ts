import { planPositionMoves, PositionMove } from './position-moves';

function occupiedAfter(start: Array<{ id: string; position: number }>, moves: PositionMove[]): Map<string, number> {
  const positionOf = new Map(start.map((assignment) => [assignment.id, assignment.position]));
  for (const move of moves) {
    const places = new Set(positionOf.values());
    places.delete(positionOf.get(move.id)!);
    expect(places.has(move.position)).toBeFalse();
    positionOf.set(move.id, move.position);
  }
  return positionOf;
}

describe('planPositionMoves', () => {
  it('swaps two referees by stepping through the free third place', () => {
    const start = [
      { id: 'a', position: 1, desired: 2 },
      { id: 'b', position: 2, desired: 1 }
    ];

    const moves = planPositionMoves(start, 3);

    expect(moves).not.toBeNull();
    const finalPositions = occupiedAfter(start, moves!);
    expect(finalPositions.get('a')).toBe(2);
    expect(finalPositions.get('b')).toBe(1);
    expect(moves!.some((move) => move.position === 3)).toBeTrue();
  });

  it('moves the remaining referees into places freed by a removal', () => {
    const start = [
      { id: 'b', position: 2, desired: 1 },
      { id: 'c', position: 3, desired: 2 }
    ];

    expect(planPositionMoves(start, 3)).toEqual([
      { id: 'b', position: 1 },
      { id: 'c', position: 2 }
    ]);
  });

  it('does nothing when the order is unchanged', () => {
    expect(planPositionMoves([
      { id: 'a', position: 1, desired: 1 },
      { id: 'b', position: 2, desired: 2 }
    ], 3)).toEqual([]);
  });

  it('refuses a reorder when all three places are taken', () => {
    expect(planPositionMoves([
      { id: 'a', position: 1, desired: 2 },
      { id: 'b', position: 2, desired: 3 },
      { id: 'c', position: 3, desired: 1 }
    ], 3)).toBeNull();
  });
});
