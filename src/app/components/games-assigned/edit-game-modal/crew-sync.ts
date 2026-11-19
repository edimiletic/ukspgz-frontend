export interface CrewAssignment {
  id: string;
  userId: string;
  role: string;
  position?: number;
  status?: string;
}

export interface DesiredCrewAssignment {
  userId: string;
  role: string;
  position?: number;
}

export interface CrewSyncPlan {
  remove: Array<{ id: string; userId: string }>;
  positionUpdates: Array<{ id: string; position: number }>;
  add: DesiredCrewAssignment[];
  addedUserIds: string[];
  replacementNotice: { removedUserIds: string[]; addedUserIds: string[] } | null;
}

const crewKey = (userId: string, role: string): string => `${userId}:${role}`;

const isActiveAssignment = (status?: string): boolean => status !== 'Rejected';

/**
 * A rejected nomination still occupies its slot. Keeping that official selected
 * must remove the rejection and create a new pending nomination. An active
 * nomination is left in place, aside from a position change.
 */
export function planCrewSync(
  current: CrewAssignment[],
  desired: DesiredCrewAssignment[]
): CrewSyncPlan {
  const remove: Array<{ id: string; userId: string }> = [];
  const positionUpdates: Array<{ id: string; position: number }> = [];

  for (const assignment of current) {
    const desiredMatch = desired.find(
      candidate => crewKey(candidate.userId, candidate.role) === crewKey(assignment.userId, assignment.role)
    );

    if (!desiredMatch || !isActiveAssignment(assignment.status)) {
      remove.push({ id: assignment.id, userId: assignment.userId });
      continue;
    }

    if (desiredMatch.position && desiredMatch.position !== assignment.position) {
      positionUpdates.push({ id: assignment.id, position: desiredMatch.position });
    }
  }

  const add = desired.filter(candidate =>
    !current.some(assignment =>
      isActiveAssignment(assignment.status) &&
      crewKey(assignment.userId, assignment.role) === crewKey(candidate.userId, candidate.role)
    )
  );

  const removedUserIds = remove.map(item => item.userId);
  const addedUserIds = add.map(item => item.userId);
  const previouslyAssigned = new Set(current.map(assignment => assignment.userId));
  const reissuedUserIds = new Set(
    add
      .filter(candidate =>
        current.some(assignment =>
          assignment.status === 'Rejected' &&
          assignment.userId === candidate.userId &&
          assignment.role === candidate.role
        )
      )
      .map(candidate => candidate.userId)
  );
  const noticeRemoved = removedUserIds.filter(userId => !reissuedUserIds.has(userId));
  const noticeAdded = addedUserIds.filter(userId => !previouslyAssigned.has(userId));

  return {
    remove,
    positionUpdates,
    add,
    addedUserIds,
    replacementNotice: noticeRemoved.length && noticeAdded.length
      ? { removedUserIds: noticeRemoved, addedUserIds: noticeAdded }
      : null
  };
}
