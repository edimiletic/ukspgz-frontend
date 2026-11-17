export interface CalendarParts {
  year: number;
  month: number;
  day: number;
}

export type AbsenceWindow = 'future' | 'ongoing' | 'past';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function calendarParts(value: string | null | undefined): CalendarParts | null {
  const match = CALENDAR_DATE.exec(String(value ?? '').trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

export function calendarDayStart(value: string | null | undefined): Date | null {
  const parts = calendarParts(value);
  if (!parts) {
    return null;
  }
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
}

export function calendarDayEnd(value: string | null | undefined): Date | null {
  const parts = calendarParts(value);
  if (!parts) {
    return null;
  }
  return new Date(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999);
}

export function formatCalendarDate(value: string | null | undefined): string {
  const start = calendarDayStart(value);
  if (!start) {
    return '';
  }
  return start.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function sameCalendarDay(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = calendarParts(left);
  const b = calendarParts(right);
  if (!a || !b) {
    return false;
  }
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function gameKickoff(dateValue: string | null | undefined, timeValue?: string | null): Date {
  const parts = calendarParts(dateValue);
  if (!parts) {
    return new Date(NaN);
  }
  const [hours = '0', minutes = '0'] = String(timeValue || '00:00').split(':');
  return new Date(parts.year, parts.month - 1, parts.day, Number(hours) || 0, Number(minutes) || 0, 0, 0);
}

export function isKickoffPast(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined,
  now = new Date()
): boolean {
  return gameKickoff(dateValue, timeValue).getTime() < now.getTime();
}

export function classifyAbsence(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  now = new Date()
): AbsenceWindow {
  const start = calendarDayStart(startValue);
  const end = calendarDayEnd(endValue);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!start || !end) {
    return 'past';
  }
  if (start > today) {
    return 'future';
  }
  if (end >= today) {
    return 'ongoing';
  }
  return 'past';
}
