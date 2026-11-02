export function calendarDay(value?: string | null): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? '').trim());
  return match ? match[1] : '';
}

export function absenceCoversGameDate(
  absence: { startDate?: string | null; endDate?: string | null } | null | undefined,
  gameDate?: string | null
): boolean {
  const day = calendarDay(gameDate);
  const start = calendarDay(absence?.startDate);
  const end = calendarDay(absence?.endDate);
  if (!day || !start || !end) {
    return false;
  }
  return start <= day && day <= end;
}

export function findCoveringAbsence<T extends { startDate?: string | null; endDate?: string | null }>(
  absences: readonly T[] | null | undefined,
  gameDate?: string | null
): T | undefined {
  if (!Array.isArray(absences)) {
    return undefined;
  }
  return absences.find((absence) => absenceCoversGameDate(absence, gameDate));
}
