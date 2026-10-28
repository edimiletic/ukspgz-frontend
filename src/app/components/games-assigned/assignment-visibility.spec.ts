import { assignedGameBucket } from './assignment-visibility';

describe('assignedGameBucket', () => {
  it('drži nadolazeću prihvaćenu utakmicu među potvrđenima', () => {
    expect(assignedGameBucket('Accepted', 'Scheduled', true)).toBe('confirmed');
  });

  it('otkazanu prihvaćenu utakmicu seli u povijest i kad je termin u budućnosti', () => {
    expect(assignedGameBucket('Accepted', 'Cancelled', true)).toBe('history');
  });

  it('otkazanu nominaciju na čekanju ne ostavlja za prihvat', () => {
    expect(assignedGameBucket('Pending', 'Cancelled', true)).toBe('history');
  });

  it('nominaciju na čekanju ostavlja otvorenom i nakon termina', () => {
    expect(assignedGameBucket('Pending', 'Scheduled', false)).toBe('pending');
  });

  it('odigranu prihvaćenu utakmicu stavlja u povijest', () => {
    expect(assignedGameBucket('Accepted', 'Completed', false)).toBe('history');
  });

  it('odbijenu nominaciju stavlja u povijest', () => {
    expect(assignedGameBucket('Rejected', 'Scheduled', true)).toBe('history');
  });
});
