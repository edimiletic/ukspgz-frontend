import { absenceCoversGameDate, calendarDay, findCoveringAbsence } from './assignment-acceptance.helpers';

describe('assignment acceptance absences', () => {
  it('čita kalendarski dan iz ISO datuma i vremena', () => {
    expect(calendarDay('2026-11-15T18:00:00.000Z')).toBe('2026-11-15');
    expect(calendarDay('2026-11-15')).toBe('2026-11-15');
    expect(calendarDay('')).toBe('');
  });

  it('odsustvo pokriva utakmicu na početku, unutar i na zadnji dan', () => {
    const absence = { startDate: '2026-11-15', endDate: '2026-11-17T00:00:00.000Z' };
    expect(absenceCoversGameDate(absence, '2026-11-15T19:30:00.000Z')).toBeTrue();
    expect(absenceCoversGameDate(absence, '2026-11-16')).toBeTrue();
    expect(absenceCoversGameDate(absence, '2026-11-17T00:00:00.000Z')).toBeTrue();
    expect(absenceCoversGameDate(absence, '2026-11-14')).toBeFalse();
    expect(absenceCoversGameDate(absence, '2026-11-18')).toBeFalse();
  });

  it('ne tretira nepotpun datum kao pokriće', () => {
    expect(absenceCoversGameDate({ startDate: '2026-11-15', endDate: '' }, '2026-11-15')).toBeFalse();
    expect(absenceCoversGameDate({ startDate: '2026-11-15', endDate: '2026-11-15' }, '')).toBeFalse();
  });

  it('nalazi odsustvo koje pokriva datum utakmice', () => {
    const absences = [
      { startDate: '2026-10-01', endDate: '2026-10-02' },
      { startDate: '2026-11-15', endDate: '2026-11-15' }
    ];
    expect(findCoveringAbsence(absences, '2026-11-15T18:00:00.000Z')).toBe(absences[1]);
    expect(findCoveringAbsence(absences, '2026-12-01')).toBeUndefined();
    expect(findCoveringAbsence(null, '2026-11-15')).toBeUndefined();
  });
});
