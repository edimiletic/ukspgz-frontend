# Statistika, katalog i osobe za nominaciju

Tri pregleda koja README ne pokriva. Sva tri ovise o ulozi iz [Uloge, rute i nominacije](uloge-i-nominacije.md). API baza je `environment.apiUrl`.

## Katalog ekipa i dvorana

`CatalogService` (`src/app/services/catalog.service.ts`) ima dva poziva. Modal utakmice ih vuče pri otvaranju. Pad poziva prazni tu listu i ne prikazuje grešku.

| Poziv | Oblik |
| --- | --- |
| `GET /catalog/teams` | `{ _id, name, competitions[] }` |
| `GET /catalog/venues` | `{ _id, name }` |

Ekipe za odabrano natjecanje bira `teamEligibleForCompetition`:

- klub je u listi ako `competitions` sadrži to natjecanje ili njegov `canonicalCompetition` (`FAVBET PREMIJER LIGA` i `SuperSport Premijer liga` su isti);
- `KUP «K. ĆOSIĆ»` uzima klubove iz `SuperSport Premijer liga`, `FAVBET PREMIJER LIGA` ili `PRVA MUŠKA LIGA`;
- `KUP «R. MEGLAJ-RIMAC»` uzima klubove iz `PREMIJER ŽENSKA LIGA`.

Dok natjecanje nije odabrano, padajući izbornik ekipa je zaključan („Prvo odaberite natjecanje”). Ako za ligu ima bar jedan klub, unos je izbornik, abecedno (`hr`). Ako katalog za tu ligu nema nijedan klub, polja ekipe postaju slobodan tekst. Promjena natjecanja briše domaćina ili gosta koji nisu u novoj listi. Ime koje je već na utakmici, a nema ga u katalogu, ostaje kao prva stavka dok se natjecanje ne promijeni.

Dvorana je combobox (`app-venue-search`) nad imenima iz `GET /catalog/venues`, plus trenutno mjesto ako ga katalog nema. Filter je podniz, neosjetljiv na velika slova (`hr`). Tipkanje koje se razlikuje od odabranog imena briše vrijednost forme; slobodan tekst koji nije na listi se ne sprema. Strelica, Enter i Escape opisani su u [Uloge, rute i nominacije](uloge-i-nominacije.md).

Lige kluba iz istog kataloga odlučuju je li kontrolor obavezan. Usporedba je po točnom `name`.

## Osobe za nominaciju

Stranica `/eligible-officials`. Guard i stavka izbornika: `canViewEligibleOfficials` (admin ili bilo koji povjerenik).

Jedan poziv: `GET /users/eligible-officials`. Odgovor je `{ competitions: [{ competition, officials[] }] }`. Osoba nosi `_id`, ime, prezime, opcionalni `email`, `roles[]`, `rang`, `najvisaLiga`. Podnaslov kaže da se osoba podobna za više liga prikazuje samo na višoj; to grupiranje radi API. Klijent grupe ne spaja.

Filter uloge je lokalni: `Sudac` (zadano), `Delegat`, `Kontrolor` ili sve. Prazna grupa se ne crta. Svaka liga ima svoju stranicu od 10 redova. Greška učitavanja je „Greška pri učitavanju popisa osoba.” Prazan odgovor: „Nema natjecanja dodijeljenih vašoj ulozi.”

Ovo nije popis iz kojeg modal bira suce. Modal i dalje zove `GET /users/referees` i filtrira cap na klijentu.

## Statistika

Stranica `/statistics`. Guard: `canViewStatistics`. `getStatisticsRoles` za admina i oba povjerenika vraća `Sudac`, `Delegat`, `Kontrolor`. Zadana uloga je `Sudac`, osim ako je nema u tom popisu. Promjena uloge, razdoblja ili natjecanja ponovo vuče sve brojke. Na širini do 768 px filteri su iza gumba s `aria-expanded`.

Zadano razdoblje je sezona, a jedina stavka u izborniku je `2026/2027` (`DEFAULT_STATISTICS_SEASON`). `currentSeasonLabel` postoji u helperu i nije vezan na formu.

| Razdoblje | Raspon koji klijent šalje |
| --- | --- |
| Mjesec | prvi dan do zadnjeg dana `selectedYear` + `selectedMonth` |
| Godina | `01-01` do `12-31` |
| Sezona | `1. rujna` početne godine do `31. kolovoza` sljedeće |
| Prilagođeno | oba datuma iz forme; ako jedan fali, datumski filter se ne šalje i odsustvo se ne sužava |

### Odakle brojke

Račun je u `src/app/components/statistics/statistics.helpers.ts`. Stranica ne zove poseban statistics endpoint.

1. `GET /users/referees` dijeli osobe na suce, delegate i kontrolore. Komentar na servisu kaže da je poziv za admina; stranica ga svejedno šalje i povjereniku. Pad ovog ili sljedećeg poziva prazni tablice utakmica, a odsustvo i nalozi i dalje se pokušavaju.
2. `GET /basketball-games?startDate&endDate&competition` (`getAllGames`). Natjecanje se dodaje samo ako je odabrano.
3. `GET /basketball-games/rejection-counts?role&startDate&endDate&competition`. Pad ovog poziva ostavlja odbijanja na nuli i ne ruši ostatak.
4. `getAllAbsences()` — prvih 100 odsustava. Vidi limit u [Ispiti, odsustvo i putni nalozi](ispiti-odsustvo-putni.md).
5. `GET /travel-expense` bez filtera (`getAllTravelExpenses`).

Utakmice u tablici osoba su samo dodjele sa statusom `Accepted` i ulogom filtra. Red ostaje i kad nema prihvaćenih utakmica, ako broj odbijanja nije nula. Sort je broj utakmica, pa odbijanja. Prvih 10 redova je vidljivo, ostalo iza „Prikaži sve”.

Stupac „Najčešće natjecanje” čita prvi ključ objekta `competitions`. Ključ nastaje redom prolaska utakmica, pa to nije nužno natjecanje s najvećim brojem.

Tablica natjecanja broji svaku utakmicu iz odgovora, i onu bez prihvaćene osobe odabrane uloge. „Broj osoba” je skup prihvaćenih `userId` te uloge. `avgRefereesPerGame` se izračuna i ne prikazuje. Za ulogu `Kontrolor` natpis je „Broj korisnika” (`rolePeopleLabel` nema poseban oblik).

Odsustvo ulazi ako se raspon sječe s filtrom. Dani su cijelo trajanje zapisa, uključivo, a ne samo dio unutar filtra. Osoba se prepoznaje po `personalCode`. Mjesec u `byMonth` je UTC prefiks `toISOString()` datuma početka, pa lokalni datum oko ponoći može pasti u prethodni mjesec. Top 5 sortira dane silazno.

Putni nalozi se broje, ne zbrajaju. `totalAmount` i `avgAmountPerExpense` helper na kraju postavlja na 0, a predložak iznose ne crta. U filter ulaze nalozi čiji je `createdAt` ili `dateFrom` unutar raspona, čiji `userId` postoji u listi te uloge i čiji `assignmentRole` ili nedostaje ili je jednak filtru. Oba kraja su `new Date('YYYY-MM-DD')`, ponoć UTC. `createdAt` s vremenom kasnijim od te ponoći na zadnji dan ispada. Top 5 sortira broj naloga. Predložak uzima zadnjih šest ključeva `byMonth` redom umetanja, ne kalendarski posljednjih šest mjeseci.
