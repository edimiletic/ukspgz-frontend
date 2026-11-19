import { planCrewSync } from './crew-sync';

describe('planCrewSync', () => {
  const sudac = (id: string, userId: string, status: string, position = 1) => ({
    id,
    userId,
    role: 'Sudac',
    position,
    status
  });

  it('leaves an accepted official in place', () => {
    const plan = planCrewSync(
      [sudac('a1', 'u1', 'Accepted', 1)],
      [{ userId: 'u1', role: 'Sudac', position: 1 }]
    );

    expect(plan.remove).toEqual([]);
    expect(plan.add).toEqual([]);
    expect(plan.positionUpdates).toEqual([]);
    expect(plan.replacementNotice).toBeNull();
  });

  it('patches only the position of a pending official', () => {
    const plan = planCrewSync(
      [sudac('a1', 'u1', 'Pending', 1)],
      [{ userId: 'u1', role: 'Sudac', position: 2 }]
    );

    expect(plan.remove).toEqual([]);
    expect(plan.add).toEqual([]);
    expect(plan.positionUpdates).toEqual([{ id: 'a1', position: 2 }]);
  });

  it('reissues a nomination when a rejected official is still selected', () => {
    const plan = planCrewSync(
      [sudac('a1', 'u1', 'Rejected', 1), sudac('a2', 'u2', 'Accepted', 2)],
      [
        { userId: 'u1', role: 'Sudac', position: 1 },
        { userId: 'u2', role: 'Sudac', position: 2 }
      ]
    );

    expect(plan.remove).toEqual([{ id: 'a1', userId: 'u1' }]);
    expect(plan.add).toEqual([{ userId: 'u1', role: 'Sudac', position: 1 }]);
    expect(plan.addedUserIds).toEqual(['u1']);
    expect(plan.positionUpdates).toEqual([]);
    expect(plan.replacementNotice).toBeNull();
  });

  it('still tells colleagues when someone leaves and a different official is added', () => {
    const plan = planCrewSync(
      [
        { id: 'a1', userId: 'u1', role: 'Sudac', position: 1, status: 'Accepted' },
        sudac('a2', 'u2', 'Accepted', 2)
      ],
      [
        { userId: 'u1', role: 'Delegat', position: 1 },
        { userId: 'u3', role: 'Sudac', position: 1 },
        { userId: 'u2', role: 'Sudac', position: 2 }
      ]
    );

    expect(plan.replacementNotice).toEqual({
      removedUserIds: ['u1'],
      addedUserIds: ['u3']
    });
  });

  it('drops a rejected official who is no longer selected and nominates the replacement', () => {
    const plan = planCrewSync(
      [sudac('a1', 'u1', 'Rejected', 1)],
      [{ userId: 'u2', role: 'Sudac', position: 1 }]
    );

    expect(plan.remove).toEqual([{ id: 'a1', userId: 'u1' }]);
    expect(plan.add).toEqual([{ userId: 'u2', role: 'Sudac', position: 1 }]);
    expect(plan.replacementNotice).toEqual({
      removedUserIds: ['u1'],
      addedUserIds: ['u2']
    });
  });
});
