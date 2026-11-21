import { isAcceptedAssignment } from './expense-claim';

describe('isAcceptedAssignment', () => {
  const game = (status: string, assignments: Array<{ userId: unknown; assignmentStatus: string }>) => ({
    status,
    refereeAssignments: assignments
  });

  it('keeps a game the official accepted', () => {
    const claimable = isAcceptedAssignment(
      game('Scheduled', [{ userId: { _id: 'me' }, assignmentStatus: 'Accepted' }]),
      'me'
    );
    expect(claimable).toBeTrue();
  });

  it('drops a game the official rejected', () => {
    const claimable = isAcceptedAssignment(
      game('Scheduled', [{ userId: { _id: 'me' }, assignmentStatus: 'Rejected' }]),
      'me'
    );
    expect(claimable).toBeFalse();
  });

  it('drops a nomination that is still pending', () => {
    const claimable = isAcceptedAssignment(
      game('Scheduled', [{ userId: 'me', assignmentStatus: 'Pending' }]),
      'me'
    );
    expect(claimable).toBeFalse();
  });

  it('drops a cancelled game even when the official had accepted', () => {
    const claimable = isAcceptedAssignment(
      game('Cancelled', [{ userId: { id: 'me' }, assignmentStatus: 'Accepted' }]),
      'me'
    );
    expect(claimable).toBeFalse();
  });

  it('drops a game where only a colleague accepted', () => {
    const claimable = isAcceptedAssignment(
      game('Scheduled', [
        { userId: { _id: 'me' }, assignmentStatus: 'Rejected' },
        { userId: { _id: 'other' }, assignmentStatus: 'Accepted' }
      ]),
      'me'
    );
    expect(claimable).toBeFalse();
  });

  it('drops every game when the current user is unknown', () => {
    const claimable = isAcceptedAssignment(
      game('Scheduled', [{ userId: { _id: 'me' }, assignmentStatus: 'Accepted' }]),
      ''
    );
    expect(claimable).toBeFalse();
  });
});
