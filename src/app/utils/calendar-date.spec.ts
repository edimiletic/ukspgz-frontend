import { classifyAbsence, formatCalendarDate, gameKickoff, isKickoffPast, sameCalendarDay } from './calendar-date';

describe('calendar-date', () => {
  const eveningKickoff = '2026-11-17T00:00:00.000Z';

  it('keeps a UTC-midnight game on the calendar day stored in the date', () => {
    const kickoff = gameKickoff(eveningKickoff, '18:00');
    expect(kickoff.getFullYear()).toBe(2026);
    expect(kickoff.getMonth()).toBe(10);
    expect(kickoff.getDate()).toBe(17);
    expect(kickoff.getHours()).toBe(18);
    expect(kickoff.getMinutes()).toBe(0);
  });

  it('treats a game later today as upcoming', () => {
    const morning = new Date(2026, 10, 17, 10, 0, 0, 0);
    expect(isKickoffPast(eveningKickoff, '18:00', morning)).toBeFalse();
    expect(isKickoffPast(eveningKickoff, '09:30', morning)).toBeTrue();
  });

  it('formats the stored calendar day, including a date-only value', () => {
    const formatted = formatCalendarDate('2026-11-17');
    expect(formatted).toContain('17');
    expect(formatted).toContain('11');
    expect(formatted).toContain('2026');
    expect(formatCalendarDate(eveningKickoff)).toBe(formatted);
  });

  it('matches a date-picker value to a UTC-midnight game or absence', () => {
    expect(sameCalendarDay('2026-11-17', eveningKickoff)).toBeTrue();
    expect(sameCalendarDay('2026-11-16', eveningKickoff)).toBeFalse();
  });

  it('keeps a one-day absence active on that calendar day and not the day before', () => {
    const onTheDay = new Date(2026, 10, 17, 15, 0, 0, 0);
    const dayBefore = new Date(2026, 10, 16, 22, 0, 0, 0);
    const dayAfter = new Date(2026, 10, 18, 0, 30, 0, 0);
    expect(classifyAbsence(eveningKickoff, eveningKickoff, dayBefore)).toBe('future');
    expect(classifyAbsence(eveningKickoff, eveningKickoff, onTheDay)).toBe('ongoing');
    expect(classifyAbsence(eveningKickoff, eveningKickoff, dayAfter)).toBe('past');
  });
});
