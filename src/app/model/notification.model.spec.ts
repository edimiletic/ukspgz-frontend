import { notificationTargetRoute, Notification } from './notification.model';

function note(partial: Partial<Notification>): Notification {
  return {
    _id: 'n1',
    userId: 'u1',
    type: 'ASSIGNMENT_RESPONSE',
    message: 'test',
    isRead: false,
    createdAt: '2026-10-15T08:00:00.000Z',
    ...partial
  };
}

describe('notificationTargetRoute', () => {
  it('vodi na assigned i kad je gameId populiran objekt', () => {
    expect(notificationTargetRoute(note({ gameId: 'g1' as any }))).toEqual(['/assigned']);
    expect(
      notificationTargetRoute(note({ gameId: { _id: 'g1' } as any }))
    ).toEqual(['/assigned']);
  });

  it('vodi na putni nalog kad postoji travelExpenseId', () => {
    expect(notificationTargetRoute(note({ travelExpenseId: 'e1' }))).toEqual(['/expenses', 'e1']);
  });
});
