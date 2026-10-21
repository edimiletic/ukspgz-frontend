import { questionNavLabel, timerLiveMessage } from './take-exam.helpers';

describe('take-exam helpers', () => {
  it('najavljuje 15, 5 i 1 minutu, ne svaku sekundu', () => {
    expect(timerLiveMessage(901)).toBeNull();
    expect(timerLiveMessage(900)).toBe('Preostalo 15 minuta.');
    expect(timerLiveMessage(300)).toBe('Preostalo 5 minuta.');
    expect(timerLiveMessage(60)).toBe('Preostalo 1 minuta.');
    expect(timerLiveMessage(0)).toBe('Vrijeme je isteklo.');
  });

  it('opisuje status pitanja u navigaciji', () => {
    expect(questionNavLabel(0, 0, false)).toBe('Pitanje 1, trenutno');
    expect(questionNavLabel(2, 0, true)).toBe('Pitanje 3, odgovoreno');
    expect(questionNavLabel(4, 0, false)).toBe('Pitanje 5, neodgovoreno');
  });
});
