# Ispiti, odsustvo i putni nalozi

API baza je `environment.apiUrl` (`http://localhost:3000/api` u razvoju). Trajanje ispita, prolaz i sadržaj pitanja računa backend. Klijent prikazuje ono što stigne i drži lokalna pravila niže.

## Ispiti

Servis: `src/app/services/exam.service.ts`. Stranice: `/exams`, `/exams/take/:id`, `/exams/result/:id`, `/exams/review/:id`.

### Pokretanje

`POST /exams/generate` s praznim tijelom. `GET /exams/current` puni karticu aktivnog ispita na `/exams`. 404 znači da aktivnog ispita nema i nije greška. Istek se računa iz `expiresAt`, ne iz konstante u frontendu. Kad `expiresAt` prođe, kartica nudi novi ispit.

Pitanja su da/ne. Broj pitanja i `passingScore` dolaze na objektu ispita. Prikaz „/25” na tablici pokušaja je fiksni nazivnik u predlošku; kartica aktivnog ispita koristi `questions.length`, a 25 samo ako je duljina 0.

Stranica rješavanja zove `GET /exams/:id` (`getExamById`), ne `GET /exams/current`. Odgovor mora imati isti `_id` kao ruta. Inače, ili ako poziv padne bez `error.error`: „Ispit nije pronađen ili je istekao.”

### Tijek rješavanja

- Preostalo vrijeme je `expiresAt - sada`. Vidljivi sat je `aria-hidden`; čitač dobiva `timerLiveMessage` na 15, 5 i 1 minuti te na 0. Na 0 klijent sam šalje ispit.
- Traka napretka je `progressbar` s brojem odgovorenih pitanja.
- Ručna predaja traži odgovor na svako pitanje. Automatska predaja šalje `null` za prazna.
- Odgovori se pišu u `sessionStorage` pod ključem `exam-answers-{examId}`. Osvježavanje kartice ih vrati. Kvote i privatni način se gutaju. `timeSpent` u minutama mjeri se od otvaranja komponente, ne od `createdAt` ispita, pa nastavak nakon izlaska ne zbraja prijašnje sjedenje.
- Predaja je `POST /exams/submit` s `{ examId, answers, timeSpent }`. Uspjeh briše spremljene odgovore i otvara `/exams/result/:id`.
- Na širini do 768 px mreža pitanja je skrivena dok korisnik ne uključi „Prikaži pitanja”. Oznaka gumba (`questionNavLabel`) kaže je li pitanje trenutno, odgovoreno ili neodgovoreno. Odabir pitanja sklapa mrežu.

Izlazak na `/exams` ne predaje ispit. Aktivan ispit se može nastaviti dok ne istekne.

### Admin na `/exams`

Samo `isAdminUser` vuče:

| Poziv | Namjena |
| --- | --- |
| `GET /exams/stats` | aktivna pitanja, broj pokušaja, `passRate` |
| `GET /exams/questions` | cijela baza; filter i stranice su na klijentu, 10 po stranici |
| `POST` / `PUT /exams/questions/:id` | tekst, točan odgovor (`true`/`false`), `isActive` |
| `DELETE /exams/questions/:id` | brisanje nakon potvrde |
| `GET /exams/attempts/all` | svi pokušaji; pretraga po imenu i naslovu |
| `DELETE /exams/attempts/:id` | brisanje pokušaja |

Vlastiti pokušaji (`GET /exams/attempts`) vide se svima. Pregled odgovora je `GET /exams/attempts/:id/review` i otvoren je i običnom korisniku za njegov red. Brisanje pokušaja u vlastitoj tablici vidi samo admin. Točan odgovor na pitanju u tijeku ispita klijent ne očekuje (`correctAnswer` je označen kao admin-only na modelu).

`GET/POST/PUT/DELETE /exams` (kolekcija, bez `:id`) postoje na servisu, ali ih nijedan ekran ne zove. `GET /exams/:id` zove samo rješavanje.

## Odsustvo

Servis: `src/app/services/absence.service.ts`. Model veže zapis na `userPersonalCode`, ne na Mongo id korisnika.

| Tko | Poziv | Što vidi |
| --- | --- | --- |
| Sudac, delegat, kontrolor | `GET /absence/my` | samo svoje |
| Admin ili povjerenik (`canSeeAllGames`) | `GET /absence?page=1&limit=1000` | tuđi pregled; klijent odbacuje `totalPages` |

`getAllAbsences()` bez argumenata šalje `limit=100`. To zovu statistika, modal utakmice i brojač odsustva na admin početnoj. Više od 1000 zapisa se ne prikaže ni na `/absence`. `getAllAbsencesPaginated` postoji, stranica ga ne koristi.

Pregled povjerenika i admina po zadanom filtrira ulogu `Sudac`. Filter uloge nudi samo `Sudac`, `Delegat`, `Kontrolor`.

- Admin na ovoj stranici ne kreira vlastito odsustvo (`canCreateOwnAbsence` je `!isAdmin`).
- Povjerenik vidi nadzirana odsustva i i dalje može kreirati, uređivati i brisati svoje.
- Urediti ili obrisati može samo vlasnik, i samo ako kraj nije prije današnjeg datuma (lokalna ponoć).
- Na već započetom odsustvu početak je zaključan. Na završenom je zaključan i kraj. Kraj ne smije biti prije početka. Razlog nije obavezan.
- `POST /absence` šalje `startDate`, `endDate`, `userPersonalCode`, opcionalni `reason`. `PUT /absence/:id` ne mijenja osobni broj.

Ako API na brisanje vrati tekst `cannot delete active`, `cannot delete past`, `Access denied` ili `not found`, klijent ga prevodi u hrvatsku poruku. Inače prikazuje `error.error` kako jest.

Odsustvo ulazi u nominaciju: dan unutar raspona čini osobu nedostupnom. Vidi [Uloge, rute i nominacije](uloge-i-nominacije.md).

## Putni nalozi

Servis: `src/app/services/travel-expense.service.ts`. Stanja na listi: `Predano`, `Odbijeno`, `Potvrđeno`.

| Poziv | Tko ga zove |
| --- | --- |
| `GET /travel-expense/my` | korisnik bez pregleda svih utakmica |
| `GET /travel-expense` i `GET /travel-expense?id&assignmentRole&userName&state` | admin ili povjerenik |
| `GET /travel-expense/eligible-games` | utakmice za novi nalog; izvan preglednika vraća prazan niz |
| `POST /travel-expense` | `FormData` predaja |
| `GET /travel-expense/:id` | detalj |
| `PATCH /travel-expense/:id/review` | `{ action: 'approve' \| 'reject', reviewComments }`. Gumb ima admin i `Povjerenik natjecanja`. Povjerenik za službene osobe vidi listu, ali ne recenzira. |
| `GET /travel-expense/:id/files/:kind` | `kind` je `nalog`, `fuel` ili `toll` |
| `GET /travel-expense/template` | predložak |
| `DELETE /travel-expense/:id` | admin uvijek; vlasnik samo dok je `Odbijeno` |

Iznosi dnevnica nisu s API-ja. Tablica za 2025./26. je `travel-expense-rates.ts`; `getTravelExpenseRate(from, to)` gleda i obrnuti smjer. Nepoznat par gradova vraća `null`.

Na početnoj, korisniku se u „na čekanju” broje i `Predano` i `Odbijeno`. Pregled svih računa samo `Predano`.

Obavijest o odobrenju ili odbijanju (`EXPENSE_APPROVED`, `EXPENSE_REJECTED`) otvara `/expenses/:id` ako payload ima `travelExpenseId`.

Statistika naloga broji komade, ne iznose. Vidi [Statistika, katalog i osobe za nominaciju](statistika-katalog-osobe.md).
