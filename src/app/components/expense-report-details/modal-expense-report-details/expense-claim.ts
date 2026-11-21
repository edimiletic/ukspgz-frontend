export interface ClaimAssignment {
  userId?: unknown;
  assignmentStatus?: string;
}

export interface ClaimGame {
  status?: string;
  refereeAssignments?: ClaimAssignment[];
}

function assignmentUserId(userId: unknown): string {
  if (userId == null || userId === '') {
    return '';
  }
  if (typeof userId === 'string' || typeof userId === 'number') {
    return String(userId);
  }
  if (typeof userId === 'object') {
    const record = userId as { _id?: unknown; id?: unknown };
    return assignmentUserId(record._id ?? record.id);
  }
  return '';
}

/** A travel line can only be filed for a game this official accepted and that was not cancelled. */
export function isAcceptedAssignment(game: ClaimGame, userId: string): boolean {
  if (!userId || game.status === 'Cancelled') {
    return false;
  }
  return (game.refereeAssignments || []).some(assignment =>
    assignment.assignmentStatus === 'Accepted' && assignmentUserId(assignment.userId) === userId
  );
}
