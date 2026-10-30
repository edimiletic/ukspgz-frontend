import { passwordPolicyError } from './password-policy';

describe('passwordPolicyError', () => {
  it('odbija kratku, samo brojeve i samo slova', () => {
    expect(passwordPolicyError('')).toContain('10');
    expect(passwordPolicyError('123456789')).toContain('10');
    expect(passwordPolicyError('samoslovaaa')).toContain('10');
  });

  it('prihvaća slovo i broj od 10 znakova', () => {
    expect(passwordPolicyError('Lozinka123')).toBeNull();
  });
});
