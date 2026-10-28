export type AssignedGameBucket = 'pending' | 'confirmed' | 'history';

/**
 * Which list an official's own assignment belongs in.
 * A cancelled game is never an open nomination or an upcoming commitment.
 */
export function assignedGameBucket(
  assignmentStatus: string | undefined,
  gameStatus: string | undefined,
  upcoming: boolean
): AssignedGameBucket | null {
  if (!assignmentStatus) {
    return null;
  }
  if (gameStatus === 'Cancelled') {
    return 'history';
  }
  if (assignmentStatus === 'Pending') {
    return 'pending';
  }
  if (assignmentStatus === 'Rejected') {
    return 'history';
  }
  if (assignmentStatus === 'Accepted') {
    return upcoming ? 'confirmed' : 'history';
  }
  return null;
}
