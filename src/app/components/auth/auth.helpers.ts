export function loginFailureMessage(error: {
  status?: number;
  error?: { error?: string } | string;
}): string {
  const apiMessage = typeof error?.error === 'string'
    ? error.error
    : error?.error?.error;
  if (apiMessage) {
    return apiMessage;
  }
  if (error?.status === 429) {
    return 'Previše neuspjelih prijava. Pokušaj ponovo za 15 minuta.';
  }
  if (!error?.status) {
    return 'Poslužitelj nije dostupan. Pokreni backend (port 3000) pa pokušaj ponovo.';
  }
  return 'Neispravno korisničko ime ili lozinka';
}
