export interface AbsencePeriod {
  startDate: string;
  endDate: string;
}

function calendarDayKey(value: string): number | null {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 10000 + Number(match[2]) * 100 + Number(match[3]);
}

/**
 * An absence covers its start and end calendar days in full.
 * Date-only values such as "2026-11-09" are UTC midnight, so comparing the raw
 * timestamp with "now" drops the absence for the whole last day.
 */
export function isAbsenceActive(absence: AbsencePeriod, now = new Date()): boolean {
  const start = calendarDayKey(absence.startDate);
  const end = calendarDayKey(absence.endDate);
  if (start == null || end == null) {
    return false;
  }
  const today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return start <= today && today <= end;
}
