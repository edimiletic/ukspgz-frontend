export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_POLICY_MESSAGE = 'Lozinka mora imati najmanje 10 znakova, slovo i broj.';

export function passwordPolicyError(password: string | null | undefined): string | null {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH || !/\p{L}/u.test(value) || !/\d/.test(value)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}
