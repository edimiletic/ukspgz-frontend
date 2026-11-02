# Sesija i lozinke

`AuthService` je u `src/app/services/login.service.ts`. Token se ne čuva u `localStorage`. Pri startu servisa, prijavi i odjavi briše se zastarjeli ključ `token`.

## Kolačić

Svi HTTP pozivi u pregledniku idu s `withCredentials: true` (`authInterceptor`). Sesiju drži httpOnly kolačić koji postavlja API.

Kad SPA i API nisu na istom hostu, API mora imati točan `CORS_ORIGIN` i `FRONTEND_URL`, te `COOKIE_SECURE=true` i `COOKIE_SAMESITE=none`. Docker build (`environment.docker.ts`) zove `/api`, a nginx to prosljeđuje na `api:3000`, pa je kolačić istog sitea. Detalji pokretanja su u [README](../README.md).

## CSRF

Token je polje `csrfToken` na `AuthService`. Nije u `localStorage`. `setCsrfToken` ignorira prazan string. `clearSession` (odjava, te 401/403 na `GET /me` i 401 u interceptoru) ga briše zajedno s korisnikom.

`authInterceptor` na svaki uspješan `HttpResponse` čita zaglavlje `X-CSRF-Token` i, ako nije prazno, sprema ga. U pregledniku uz to:

- na `POST`, `PUT`, `PATCH` i `DELETE` šalje isto zaglavlje samo ako token već postoji;
- `GET` ga ne šalje. `Authorization` se ne dodaje;
- svaki poziv ide s `withCredentials`.

Izvan preglednika interceptor ne dodaje ni kolačić ni CSRF zaglavlje. Dok nijedan odgovor nije donio token, upis ide bez njega. Na odvojenom hostu preglednik skriva tuđe zaglavlje odgovora osim ako je `X-CSRF-Token` u `Access-Control-Expose-Headers`. Inače klijent token nikad ne vidi.

## Tijek

| Akcija | Poziv |
| --- | --- |
| Prijava | `POST /login` s `{ username, password }`. Korisničko ime se trim-a. Odgovor `user` se normalizira (`roles`, primarna `role`, `_id`). |
| Obnova | `GET /me`. `AuthGuard` i `loadUserData` zovu ovo ako `currentUser$` još nema korisnika. |
| Odjava | `POST /logout`, zatim `clearSession` (korisnik i CSRF) i odlazak na `/login`. Odjava se dovrši i kad poziv padne. |
| Promjena lozinke | `POST /change-password` s `{ currentPassword, newPassword }`. |
| Nova lozinka s linka | `POST /reset-password` s `{ token, password }`. |

`GET /me` s 401 ili 403 čisti sesiju i ne preusmjerava sam. Interceptor na ostale 401 (osim `/login`, `/reset-password`, `/logout` i `/me`) čisti sesiju i vodi na `/login`.

Ako prijava vrati 429, a tijelo nema `error`, klijent prikazuje: „Previše neuspjelih prijava. Pokušaj ponovo za 15 minuta.” Tekst iz `error.error` ima prednost. To nije brojač u pregledniku.

## Pozivnica umjesto upisane lozinke

Admin na `/users` ne šalje lozinku.

- `POST /users` može vratiti `inviteUrl` i `inviteExpiresAt`. Ako stvaranje vrati `inviteUrl`, otvara se dijalog. Klijent ne ispisuje `inviteExpiresAt`.
- `POST /users/:id/password-reset-link` radi novi link za postojećeg korisnika (gumb „Novi link za lozinku”).

Tekst dijaloga „Link za lozinku” kaže da link vrijedi 24 sata, da se vidi samo jednom i da novi link poništava stari. To je copy u predlošku; sat i jednokratnost klijent ne računa. Obrazac korisnika ima isti 24-satni hint.

„Kopiraj link” upisuje URL u međuspremnik (`navigator.clipboard`, a ako padne ili ne postoji, privremeni `textarea` i `document.execCommand('copy')`). Gumb postaje „Kopirano”. U dijalogu ostaje `role="status"`: „Link je kopiran. Zalijepi ga korisniku (npr. WhatsApp).” Isti tekst ide u `showSuccess`. Zatvaranje dijaloga ili novi link gasi `inviteCopied`.

Link otvara `/set-password?token=...`. Stranica traži novu lozinku i potvrdu, pa zove `POST /reset-password`. Pravilo je `passwordPolicyError` u `src/app/utils/password-policy.ts`: najmanje 10 znakova (`PASSWORD_MIN_LENGTH`), barem jedno slovo (`\p{L}`, pa vrijede i hrvatska) i barem jedna znamenka `0-9` (`\d`). Inače je poruka „Lozinka mora imati najmanje 10 znakova, slovo i broj.” Hint na obrascu je kraći: „Najmanje 10 znakova, slovo i broj.” Prazna lozinka pada na isto pravilo. Bez `token` u queryju odmah javlja da link nije važeći. Uspjeh vodi na `/login` nakon 1,5 s. Istek i ostale greške dolaze iz `error.error` ili iste poruke o isteku.

Prijavljeni korisnik mijenja lozinku iz izbornika u zaglavlju („Promijeni lozinku”). Isto pravilo i potvrda. Ako trenutna ili nova lozinka fali, poruka je „Unesi trenutnu i novu lozinku.” i pravilo se ne provjerava. API poruka iz `error.error` zamjenjuje generičku „Promjena lozinke nije uspjela.”

## Obavijesti u zaglavlju

`HeaderComponent` na učitavanju povuče popis i nepročitani broj, pa to ponavlja svakih 30 s. Padajući izbornik drži pet najnovijih. Oznaka gumba za čitač ekrana uključuje broj nepročitanih. Klik označi obavijest pročitanom i odmah ide na cilj: `/expenses/:id` ako postoji `travelExpenseId`, inače `/assigned` ako postoji `gameId`. Tipovi i ikone su u `src/app/model/notification.model.ts`.

Gumb izbornika i gumb obavijesti imaju `aria-expanded`. Dok je `true`, Escape u otvorenom dijalogu ne zatvara dijalog; vidi [Uloge, rute i nominacije](uloge-i-nominacije.md).

## Zamke

- Testovi koji su prije stavljali JWT u `localStorage` moraju vratiti korisnika preko `GET /me`. `AppComponent` to već radi.
- Nakon `clearSession` prvi upis nema `X-CSRF-Token` dok neki uspješan odgovor (obično `GET /me` ili prijava) opet ne pošalje zaglavlje.
- Guardovi u SSR-u ne odbijaju. Ne oslanjaj se na njih za tajnost HTML-a.
- `@` u tekstu Angular predloška mora biti `&#64;`. Literarni `@` lomi produkcijski build (npr. primjer e-pošte u obrascu korisnika).
