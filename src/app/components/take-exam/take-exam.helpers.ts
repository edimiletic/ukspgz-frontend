export function timerLiveMessage(seconds: number): string | null {
  if (seconds === 900) {
    return 'Preostalo 15 minuta.';
  }
  if (seconds === 300) {
    return 'Preostalo 5 minuta.';
  }
  if (seconds === 60) {
    return 'Preostalo 1 minuta.';
  }
  if (seconds <= 0) {
    return 'Vrijeme je isteklo.';
  }
  return null;
}

export function questionNavLabel(index: number, currentIndex: number, answered: boolean): string {
  const number = index + 1;
  if (index === currentIndex) {
    return `Pitanje ${number}, trenutno`;
  }
  if (answered) {
    return `Pitanje ${number}, odgovoreno`;
  }
  return `Pitanje ${number}, neodgovoreno`;
}
