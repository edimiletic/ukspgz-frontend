import {
  displayNotificationMessage,
  notificationIconClass,
  notificationTargetRoute,
  Notification
} from './notification.model';

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

describe('displayNotificationMessage', () => {
  it('skida emoji iz stare poruke obavijesti', () => {
    expect(displayNotificationMessage('🏀 Nova nominacija: Split vs Zadar')).toBe(
      'Nova nominacija: Split vs Zadar'
    );
    expect(displayNotificationMessage('✅ Odobreno')).toBe('Odobreno');
  });
});

describe('notificationIconClass', () => {
  it('mapira tip na Font Awesome klasu', () => {
    expect(notificationIconClass('GAME_ASSIGNMENT')).toBe('fas fa-basketball-ball');
    expect(notificationIconClass('EXPENSE_REJECTED')).toBe('fas fa-times-circle');
  });

  it('za prihvat nominacije koristi kvačicu, za odbijanje iks', () => {
    expect(
      notificationIconClass('ASSIGNMENT_RESPONSE', 'Ivan Horvat je prihvatio/la nominaciju za Split vs Zadar')
    ).toBe('fas fa-check');
    expect(
      notificationIconClass('ASSIGNMENT_RESPONSE', 'Ana Jurić je odbio/la nominaciju za Split vs Zadar')
    ).toBe('fas fa-times');
  });
});

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
