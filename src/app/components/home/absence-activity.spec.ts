import { isAbsenceActive } from './absence-activity';

describe('isAbsenceActive', () => {
  const duringLastDay = new Date(2026, 10, 9, 15, 0, 0);

  it('odsustvo vrijedi cijeli zadnji kalendarski dan', () => {
    expect(isAbsenceActive(
      { startDate: '2026-11-09', endDate: '2026-11-09' },
      duringLastDay
    )).toBeTrue();
    expect(isAbsenceActive(
      { startDate: '2026-11-09T00:00:00.000Z', endDate: '2026-11-09T00:00:00.000Z' },
      duringLastDay
    )).toBeTrue();
  });

  it('višednevno odsustvo ostaje aktivno na dan završetka', () => {
    expect(isAbsenceActive(
      { startDate: '2026-11-01', endDate: '2026-11-09' },
      duringLastDay
    )).toBeTrue();
  });

  it('ne broji odsustvo prije početka ni nakon završetka', () => {
    const period = { startDate: '2026-11-09', endDate: '2026-11-09' };
    expect(isAbsenceActive(period, new Date(2026, 10, 8, 23, 0, 0))).toBeFalse();
    expect(isAbsenceActive(period, new Date(2026, 10, 10, 0, 30, 0))).toBeFalse();
  });
});
