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

Odsustvo ulazi u nominaciju: dan unutar raspona čini osobu nedostupnom, a modal kraj dana gura na 23:59:59. Kartica na `/home` (`activeAbsences`) uspoređuje `startDate` i `endDate` sa satom bez tog pomaka. Vidi [Uloge, rute, popis utakmica i nominacije](uloge-i-nominacije.md).

## Putni nalozi

Servis: `src/app/services/travel-expense.service.ts`. Stanja na listi: `Predano`, `Odbijeno`, `Potvrđeno`.

| Poziv | Tko ga zove |
| --- | --- |
| `GET /travel-expense/my?page&limit` | korisnik bez pregleda svih utakmica (`getCurrentUserTravelExpenses`). Izvan preglednika vraća prazan niz i ne zove API. |
| `GET /travel-expense?page&limit` | admin ili povjerenik (`getAllTravelExpenses`), te statistika |
| `GET /travel-expense?id&assignmentRole&userName&state` | `getTravelExpensesWithFilters`. Nijedan ekran ga ne zove i ne dodaje `page` ni `limit`. |
| `GET /travel-expense/eligible-games` | utakmice za novi nalog; izvan preglednika vraća prazan niz |
| `POST /travel-expense` | `FormData` predaja |
| `GET /travel-expense/:id` | detalj |
| `PATCH /travel-expense/:id/review` | `{ action: 'approve' \| 'reject', reviewComments }`. Gumbi su na detalju, ne na listi. Vidi niže. |
| `GET /travel-expense/:id/files/:kind` | `kind` je `nalog`, `fuel` ili `toll` |
| `GET /travel-expense/template` | predložak |
| `DELETE /travel-expense/:id` | admin uvijek; vlasnik samo dok je `Odbijeno` |

`getCurrentUserTravelExpenses` i `getAllTravelExpenses` bez argumenata šalju `page=1` i `limit=100`. Odgovor `{ expenses, total, currentPage, totalPages }` se skida na niz `expenses`. Goli niz i dalje prolazi (`unwrapExpenses`). `null` i tijelo bez `expenses` daju `[]`. `total` i `totalPages` se bacaju, pa ekran ne zna da ima još stranica.

`/expenses` i početna zovu te metode bez argumenata. Statistika isto, preko `getAllTravelExpenses()`. Nalog izvan prve stotice ne ulazi u listu, klijentske filtere ni brojače na početnoj.

Na početnoj, korisniku se u „na čekanju” broje i `Predano` i `Odbijeno`. Pregled svih računa samo `Predano`.

### Tko vidi listu

`showNamedOverview` je admin ili povjerenik (`canSeeAllGames`, a admin se ne broji kao „nadzor”). Oni zovu `getAllTravelExpenses`. Službena osoba zove `getCurrentUserTravelExpenses`. Gumb „Novi putni nalog” vidi svatko; klijent ga ne skriva adminu. Natpis kaže da službena osoba predaje nalog za utakmicu s prihvaćenom nominacijom. Koje su to utakmice odlučuje `GET /travel-expense/eligible-games`, ne filter na klijentu.

Tri sekcije (`Predano`, `Odbijeno`, `Potvrđeno`) sortirane su po `createdAt` silazno. Nedostajući datum ide na kraj. Svaka sekcija ima 10 redova. Izmjena filtera vraća sve tri stranice na 1. Ponovno učitavanje nakon predaje ili brisanja stranicu ne dira (`applyFilters(false)`). Na širini do 693 px filteri su iza gumba s `aria-expanded`, isto kao popis utakmica.

| Filter | Pravilo |
| --- | --- |
| ID | podniz `displayId`, ne Mongo `_id` |
| Uloga | točan `assignmentRole`; vidi se samo u nadzoru, zadano `Sudac`. Vlastiti nalog prolazi i kad uloga ne odgovara |
| Korisnik | podniz `travelExpensePersonName` (`userName`/`userSurname`, pa populate-ani `userId`) |
| Godina i mjesec | lokalni `getFullYear` / `CROATIAN_MONTHS[getMonth()]` datuma utakmice. Godine u izborniku su samo 2024–2027. Ako je `gameId` string, a ne objekt, oba filtera zapis izbacuju |
| Status | točan `state` |

„Očisti” ulogu u nadzoru vraća na `Sudac`, ostalima na prazno. Brisanje na listi: admin uvijek, vlasnik samo dok je `Odbijeno`. Ako tijelo nema string `error`, status 400, 403 i 404 dobiju hrvatsku rečenicu. Gumb „Pregled” samo otvara `/expenses/:id`. Servis nema `PUT` naloga.

`?message=deleted` nakon brisanja s detalja pokaže „Putni nalog je obrisan.” i odmah skine query (`replaceUrl`).

### Predaja

Modal (`expenses-modal`) pri otvaranju resetira formu i zove `GET /travel-expense/eligible-games`. Pad poziva prazni izbornik i javlja „Nije moguće učitati utakmice za nalog.” Natpis stavke je lokalni datum, vrijeme, ekipe i `assignmentRole`.

Predložak je `GET /travel-expense/template`, spremljen kao `Putni nalog HKS.xls`.

`POST /travel-expense` je `FormData`:

| Polje | Pravilo |
| --- | --- |
| `gameId` | obavezan |
| `usedHighway` | string `"true"` ili `"false"`, ne boolean |
| `nalog` | obavezan; nastavak imena `.xls`, `.xlsx` ili `.pdf` |
| `fuelReceipt` | obavezan PDF |
| `tollReceipt` | samo ako je autocesta uključena, i tada obavezan PDF |

Nastavak se gleda na imenu datoteke (`toLowerCase`), ne na MIME tipu. Gašenje autoceste briše odabrani račun cestarine i ne šalje ga. Dok `isLoading`, backdrop i zatvaranje ne rade. Uspjeh javlja „Putni nalog je predan.”, ponovo vuče listu i, ako odgovor ima `id` ili `_id`, otvara `/expenses/:id`.

Na odbijenom detalju vlasnik vidi da nalog treba predati ponovo istim obrascem. Posebnog uređivanja nema.

### Odobrenje i odbijanje

`shouldShowAdminReview` traži stanje `Predano`, da gledatelj nije vlasnik, i da je admin ili `Povjerenik natjecanja`. Vlasnik koji je ujedno admin ili povjerenik natjecanja svoje gumbe ne vidi. `Povjerenik za službene osobe` listu vidi, gumbe ne.

„Odobri” šalje `reviewComments: ""`. „Odbij” otvara `app-reason-modal` s `minLength` 1 i `maxLength` 500. Prazna napomena nakon `trim` ne zove API; poruka je „Unesite napomenu što korisnik treba ispraviti.” To nije prag od 10 znakova kao kod odbijanja nominacije.

Prilozi se crtaju samo ako zapis ima `nalogFile` ili `fuelReceiptFile`. Cestarina se crta uz to samo kad je `usedHighway`. Preuzimanje je `GET /travel-expense/:id/files/:kind` kao blob, s `originalName` kao imenom datoteke.

### Tablica dnevnica se ne crta

Živi obrazac iznose ne računa. `getTravelExpenseRate` i `TRAVEL_EXPENSE_RATES` (2025./26., i obrnuti smjer, nepoznat par je `null`) zove samo `app-modal-expense-report-details`. Taj modal nije uvezen ni u jedan predložak, pa tablica gradova na ekranu ne postoji. Statistika i dalje forsira iznose na 0. Vidi [Statistika, katalog i osobe za nominaciju](statistika-katalog-osobe.md).

Obavijest o odobrenju ili odbijanju (`EXPENSE_APPROVED`, `EXPENSE_REJECTED`) otvara `/expenses/:id` ako payload ima `travelExpenseId`.

Statistika naloga broji komade, ne iznose. Vidi [Statistika, katalog i osobe za nominaciju](statistika-katalog-osobe.md).
