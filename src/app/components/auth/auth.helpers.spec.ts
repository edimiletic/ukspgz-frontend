import { loginFailureMessage } from './auth.helpers';

describe('loginFailureMessage', () => {
  it('koristi poruku s API-ja', () => {
    expect(loginFailureMessage({ status: 401, error: { error: 'Neispravni podaci' } }))
      .toBe('Neispravni podaci');
  });

  it('prepoznaje da API nije dostupan', () => {
    expect(loginFailureMessage({ status: 0 })).toContain('Poslužitelj nije dostupan');
    expect(loginFailureMessage({})).toContain('Poslužitelj nije dostupan');
  });
});
