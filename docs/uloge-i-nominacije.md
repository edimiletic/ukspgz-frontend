# Uloge, rute i nominacije

Izvor pravila je `src/app/model/roles.ts`. Rute su u `src/app/app.routes.ts`, izbornik u `src/app/components/sidebar/sidebar.component.ts`. Sučelje je na hrvatskom.

`Kontrolor` je uloga na utakmici. Poseban ekran za ocjenjivanje (Kontrola) više ne postoji.

## Uloge

| Uloga | Što klijent dopušta |
| --- | --- |
| `Admin` | Sve provjere uloga prolaze. Vidi sve utakmice, statistiku i osobe za nominaciju. Jedini ulazi na `/users`. |
| `Povjerenik natjecanja` | Kalendar natjecanja koja su mu dodijeljena. Odobrava i odbija putne naloge. Vidi statistiku i osobe za nominaciju. |
| `Povjerenik za službene osobe` | Nominira suca, delegata i kontrolora na svojim natjecanjima. Vidi statistiku i osobe za nominaciju. Ne odobrava putne naloge. |
| `Sudac`, `Delegat`, `Kontrolor` | Dodjele na utakmici. Vide vlastite utakmice, odsustva i putne naloge. |

Povjerenik bez popisa natjecanja (`competitions: []`) tretira se kao da pokriva sva natjecanja iz `ALL_COMPETITIONS`. Admin uvijek pokriva sva.

`pickPrimaryRole` bira `Admin` čim je ta uloga u popisu, pa tek onda prvu terensku ulogu (`Sudac`, `Delegat`, `Kontrolor`). Korisnik koji je i admin i sudac u sesiji ostaje `Admin`.

## Nespojive uloge

Obrazac korisnika (`user-form-modal`) odbija kombinacije iz `INCOMPATIBLE_ROLE_PAIRS`:

- Sudac + Delegat
- Sudac + Kontrolor
- Delegat + Kontrolor
- Sudac + Povjerenik natjecanja

Mora biti odabrana barem jedna uloga. Povjerenik mora imati barem jedno natjecanje. Ako je liga već zauzeta, forma je preuzima s postojećeg povjerenika, ali ne smije ostaviti tog korisnika bez ijedne uloge. Poruka traži da mu se prvo doda druga uloga ili ostavi barem jedno natjecanje.

Za suca su obavezni `rang` (`Državni sudac` ili `Županijski sudac`) i `najvisaLiga`. Za delegata i kontrolora obavezna je samo `najvisaLiga`. Lozinku admin ne upisuje; vidi [Sesija i lozinke](sesija-i-lozinke.md).

## Rute

Sve osim `/login` i `/set-password` su lazy i sjede u `AppShellComponent` iza `AuthGuard`.

| Putanja | Tko prolazi guard |
| --- | --- |
| `/login`, `/set-password` | javno |
| `/home`, `/assigned`, `/absence`, `/expenses`, `/expenses/:id`, `/documents`, `/exams`, `/notifications` | prijavljeni korisnik |
| `/exams/take/:id`, `/exams/result/:id`, `/exams/review/:id` | prijavljeni; sidebar je skriven (`hideSidebar`) |
| `/statistics` | `canViewStatistics`: admin ili bilo koji povjerenik |
| `/eligible-officials` | `canViewEligibleOfficials`: admin ili bilo koji povjerenik |
| `/users` | samo admin |

Na poslužitelju (SSR) guardovi vraćaju `true`. Ograničenje vrijedi u pregledniku, nakon `GET /me`. Odbijenica vodi na `/home` s `error=access_denied`.

Naslov kartice je `{naslov rute} — UHKS` (`UhksTitleStrategy`, `data.title` na ruti). Izbornik su stvarni `routerLink`ovi; na širini do 768 px klik na stavku zatvara ladicu.

## Odgovor na nominaciju

Terenska uloga (`isFieldOfficial`: bilo koja od `Sudac`, `Delegat`, `Kontrolor`) vidi sandučić „Nominacije koje čekaju odluku” na `/home` čim `GET /basketball-games/my-assignments` vrati dodjelu sa statusom `Pending` za trenutni `_id`.

Isti odgovor postoji na `/assigned`, ali gumbi su samo kad `canSeeAllGames` nije istina. Povjerenik koji vidi sve utakmice nema gumbe na listi; ako uz to ima terensku ulogu, odluku donosi s početne. Admin nema ni sandučić ni gumbe: početna za admina ne vuče vlastite dodjele.

Oba ekrana zovu `PATCH /basketball-games/:id/respond-assignment`:

```json
{ "response": "Accepted" }
{ "response": "Rejected", "rejectionReason": "…" }
```

Prihvat traži potvrdu. Odbijanje traži razlog od 10 do 500 znakova (`app-reason-modal`). Dok poziv traje, gumbi i zatvaranje dijaloga su zaključani. Uspjeh javlja da je povjerenik obaviješten i ponovo učitava početnu. Greška je „Greška pri odgovaranju na nominaciju.” Detalji u dijalogu su ekipe, datum i vrijeme, dvorana i natjecanje (`nominationDecisionDetails`).

## Nominacija utakmice

Modal je `edit-game-modal`. Korak podataka traži natjecanje, različite domaćina i gosta, datum, vrijeme i mjesto. Ekipe i dvorane dolaze iz kataloga; vidi [Statistika, katalog i osobe za nominaciju](statistika-katalog-osobe.md).

Tko smije nominirati: admin ili `Povjerenik za službene osobe` za to natjecanje (`canNominateOfficials`). Popis dolazi s `GET /users/referees` i dijeli se po ulozi. Zatim `eligibleOfficials` izbacuje:

- osobu čiji je rang natjecanja (`COMPETITION_RANK` od `najvisaLiga`) niži od ranga utakmice;
- samog prijavljenog korisnika, osim ako je admin (`cannotNominateSelf`).

`FAVBET PREMIJER LIGA` se prije usporedbe svodi na `SuperSport Premijer liga` (`canonicalCompetition`). Ženska premijer liga (70) je ispod prve muške (80).

Kad korisnik smije nominirati, spremanje traži tri suca na pozicijama 1–3, delegata i da nitko nije odabran dvaput. `sudacSlotsFromAssignments` čuva broj pozicije ako je u rasponu 1–3. Kontrolor je obavezan (`isKontrolorRequired`) na SuperSportu uvijek, a na Kupu «K. Ćosić» samo kad su oba kluba u muškoj premijer ligi (SuperSport ili FAVBET). Lige klubova čitaju se iz kataloga po točnom imenu ekipe. Na ostalim natjecanjima kontrolor nije obavezan.

Osoba nije slobodna ako:

- datum utakmice pada u njezino odsustvo (uključivo, kraj dana je 23:59:59), ili
- istog dana ima `Accepted` ili `Pending` dodjelu unutar 60 minuta (`timesOverlap`) na natjecanju čiji je rang veći ili jednak novom (`isBlockingScheduleConflict`).

Bez datuma i vremena klijent sve smatra slobodnima. Raspored dana je `GET /basketball-games/schedule/:date`.

Modal utakmice za provjeru dostupnosti zove `getAllAbsences()` bez argumenata, dakle `limit=100`. Popis odsustva na `/absence` traži 1000. Odsustvo izvan prve stotice ne blokira nominaciju u modalu.

### Već nominirana osoba ostaje odabrana

Pri uređivanju, `Pending` i `Accepted` dodjele ostaju u padajućem izborniku i kad osoba više ne prolazi cap ili dostupnost. `Rejected` se ne vraća.

`assignedOfficialFromNomination` od populate-anog `userId` složi privremeni zapis. Ako ime nije stiglo, prikaz je „Nominirana osoba”. `optionsWithSelected` taj zapis stavi na vrh ako ga filtrirana lista nema. `clearUnavailableSelections` na promjenu datuma ili vremena briše samo novi odabir; dodjelu koja je već na ovoj utakmici ne dira.

Povijest odbijanja je `GET /basketball-games/:id/rejection-history`. Brojevi odbijanja su `GET /basketball-games/rejection-counts`.

## Nespremljena utakmica

Backdrop, Escape i gumb za zatvaranje zovu `requestClose`. Ako se snimka forme (`gameDraftSnapshot`) razlikuje od zadnje spremljene, otvara se potvrda „Imate nespremljene izmjene”. Tijekom spremanja zatvaranje je blokirano.

## Dijalozi

Novi dijalozi trebaju `appModalPanel` (`modal-panel.directive.ts`): fokus ulazi u dijalog, Tab kruži unutra, Escape šalje `dismiss` osim dok je `appModalBusy`, a po zatvaranju fokus se vraća na element koji ga je otvorio. Gumb za zatvaranje treba `aria-label`.

Escape ne zatvara dijalog dok je fokus na elementu s `aria-expanded="true"`. Pretraga dvorane (`app-venue-search`) je combobox: strelica pomiče aktivnu stavku, Enter je bira, Escape samo sklapa listu. Isti obrazac drže izbornici u zaglavlju i mobilni filteri.

Ekrani koji čekaju podatke imaju `role="status"` i `aria-live="polite"` na bloku učitavanja, uključujući prvi zaslon aplikacije.
