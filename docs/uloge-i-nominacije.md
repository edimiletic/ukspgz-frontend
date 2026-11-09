# Uloge, rute, popis utakmica i nominacije

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

`isEligibleForCompetition` modal ne zove. Helper je u `roles.ts` i pokriven je testom: sudac i delegat prolaze uz cap, kontrolor samo ako je natjecanje u `TOP_PROFESSIONAL_COMPETITIONS` (kopija `ALL_COMPETITIONS`, bez `canonicalCompetition`, pa sirovi `FAVBET PREMIJER LIGA` ne prolazi). U padajućem izborniku kontrolor s dovoljnim `najvisaLiga` ostaje i na natjecanju izvan tih pet.

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

## Popis utakmica

Stranica je `/assigned` (`games-assigned`). Gumb „Kreiraj Utakmicu” vidi admin i `Povjerenik natjecanja` (`canManageCalendar()` bez natjecanja). Isti modal (`app-game-form-modal`) s početne otvara samo taj gumb na `/home`. `Povjerenik za službene osobe` bez kalendarske uloge vidi sve utakmice, ali ne kreira.

| Tko | Poziv |
| --- | --- |
| Admin ili bilo koji povjerenik (`canSeeAllGames`) | `GET /basketball-games` bez `page` i `limit`. Ostaje samo `games`; `pagination` se baca. |
| Terenska uloga | `GET /basketball-games/my-assignments` |

Podjela je `categorizeGames`. Usporedba „prošla / nadolazi” je lokalni datum plus `time`, ne `status`.

| Gledatelj | Prva sekcija | Potvrđene | Povijest |
| --- | --- | --- | --- |
| Vidi sve | nadolazeće, naslov „Nadolazeće utakmice” | sekcija se ne crta | prošle |
| Službena osoba | vlastiti `Pending` | vlastiti `Accepted` koji još nisu prošli | vlastiti `Accepted` koji su prošli, i svaki vlastiti `Rejected` |

Odbijena utakmica koja tek treba biti odigrana službenoj osobi je u povijesti, ne u sandučiću. Otkazana utakmica u budućnosti povjereniku ostaje među nadolazećima; bedž je „Otkazano”. `Scheduled` u prošlosti, kad se vide sve utakmice, piše „Odigrano”.

Filteri su na klijentu, prefiks (`startsWith`, `toLowerCase`) za dvoranu, ekipe i natjecanje, a datum je točan lokalni dan. Traka nema polje za `displayId`. Stranice su po 10, prozor je tekuća ± 2. Sužavanje filtra ne vraća na prvu stranicu; `paginate` samo spusti stranicu ako je iznad kraja. „Očisti” vraća stranice na 1. Na širini do 693 px filteri su iza gumba s `aria-expanded`; šire od toga se ladica gasi. To nije prag 768 px izbornika.

Gumbi prihvata i odbijanja na listi su samo kad `canSeeAllGames` nije istina, i samo u prvoj sekciji. Povjerenik s terenskom ulogom odluku donosi s početne.

Stupac uređivanja na nadolazećima vidi gledatelj koji vidi sve utakmice. Red se smije urediti ako utakmica nije prošla ili je gledatelj admin, i ako za to natjecanje smije kalendar ili nominaciju. Obriši na nadolazećima traži `canManageCalendar` za to natjecanje. Stupac akcija u povijesti vidi samo admin. `deleteGame` za prošlu utakmicu ništa ne radi ako korisnik nije admin. Brisanje je `DELETE /basketball-games/:id` nakon potvrde.

## Koraci i spremanje

Izbornik natjecanja je `getCalendarCompetitions`: admin i povjerenik natjecanja s praznim `competitions` dobiju `ALL_COMPETITIONS`, ostali povjerenici natjecanja samo svoje (već kanonizirane) lige. Natjecanje koje je već na utakmici, a nije u tom popisu, ostaje prva stavka. Prazan popis bez te stavke padne natrag na `ALL_COMPETITIONS`. `COMPETITION_RANK` ima i niže lige; obrazac ih sam ne nudi.

Na novoj utakmici modalov `canManageCalendar()` vraća `true`, pa su detalji otključani. Na postojećoj, detalji su zaključani ako korisnik za tu ligu nema kalendar. Tko smije samo nominirati otvara se na koraku 2.

Korak 1 prolazi `gameFormError` (natjecanje, različite ekipe, datum, vrijeme, mjesto). Ako korisnik ne nominira, „Spremi” / „Kreiraj utakmicu” odmah sprema. Inače „Dalje” otvara korak 2. Najraniji datum je danas, osim adminu na uređivanju (`getMinDate` prazan). Status (`Scheduled`, `Ongoing`, `Completed`, `Cancelled`) ide samo u `PUT`. Kreiranje ga ne šalje.

Kreiranje: `POST /basketball-games`, zatim redom `POST /basketball-games/:id/assign-referee`. Pad jedne dodjele ne ruši utakmicu; poruka navede uloge koje nisu dodijeljene. Uređivanje prvo skida, mijenja poziciju i dodaje, pa tek onda šalje `PUT` ako korisnik smije kalendar. Pad `PUT`-a ostavlja već promijenjene dodjele. Pad `DELETE .../remove-referee/:assignmentId` ili nove dodjele prekida ostatak i javlja „Greška pri ažuriranju utakmice.” Promjena samo pozicije (`PATCH .../referee-assignment/:assignmentId`) koja padne ostaje `console.warn` i ne prekida spremanje.

Ako `assign-referee` vrati `releasedNominations`, toast doda „Niže nominacije su puštene i trebaju novu osobu” i navede utakmice. Klijent ne bira koje. `POST .../colleague-replacement` s `{ removedUserIds, addedUserIds }` ide samo kad je netko skinut i netko tko prije uopće nije bio na utakmici dodan. Pad tog poziva ne kvari spremanje. Nakon uspjeha `/assigned` ponovo vuče listu, a početna ponovo vuče nadzornu ploču.

## Zatvaranje modala utakmice

Backdrop, Escape, „Odustani” i gumb za zatvaranje zovu `closeModal`. Nema usporedbe skice ni potvrde nespremljenih izmjena: `requestClose` i `gameDraftSnapshot` nisu više u klijentu. Za vrijeme `isLoading` Escape staje na `appModalBusy`, a „Odustani” i gumb za zatvaranje su `disabled`. Klik na backdrop i dalje zove `closeModal`.

## Početna

`/home` bira pozive po ulozi. Svi brojači utakmica koriste isti `GET /basketball-games` bez stranice kad korisnik vidi sve utakmice.

| Ploča | Utakmice | Nalozi | Odsustva | Ostalo |
| --- | --- | --- | --- | --- |
| Admin | sve, bez vlastitih dodjela | prvih 100, „na čekanju” = `Predano` | prvih 100, natpis „Aktivna odsustva” | `GET /users` za broj korisnika |
| Povjerenik | isto | isto | `GET /absence/my`, natpis „Vaša odsustva” | ako ima i terensku ulogu: `my-assignments` za sandučić i vlastiti pokušaji ispita |
| Službena osoba | samo `my-assignments` | vlastiti, „na čekanju” = `Predano` ili `Odbijeno` | vlastita | zadnji ispit kao `score/25`, zadnja dva pokušaja |

Adminu je „Nadolazeće utakmice” broj s datumom u budućnosti, a „Završene utakmice” broj prošlih u tom istom odgovoru. Popis „Najnovije aktivnosti” je pet redova po `createdAt`, pa `date`. Službenoj osobi je „Potvrđene utakmice” broj prihvaćenih koje nisu prošle, a nedavne utakmice su tri prošle prihvaćene.

Aktivno odsustvo na kartici je `startDate <= sada <= endDate` bez pomaka kraja na 23:59:59. Datum kraja koji API vrati kao ponoć UTC može ispasti s kartice iako modal nominacije taj dan još broji. Vidi [Ispiti, odsustvo i putni nalozi](ispiti-odsustvo-putni.md).

Pad jednog poziva ostavlja ostale brojke i javlja „Neki podaci nisu mogli biti učitani.” Pad `GET /me` na ulasku otvara „Pokušaj ponovo”. Pozdrav je po lokalnom satu: do 12 „Dobro jutro”, do 18 „Dobar dan”, inače „Dobra večer”.

## Dijalozi

Novi dijalozi trebaju `appModalPanel` (`modal-panel.directive.ts`): fokus ulazi u dijalog, Tab kruži unutra, Escape šalje `dismiss` osim dok je `appModalBusy`, a po zatvaranju fokus se vraća na element koji ga je otvorio. Gumb za zatvaranje treba `aria-label`.

Izlaz za zatvaranje na modalima zove se `closed` (`(closed)` u predlošku). Ime `close` se sudara s DOM događajem. `app-time-absent-modal` i dalje šalje `closeModalEvent`, a modal pitanja `closeModal`.

Escape ne zatvara dijalog dok je fokus na elementu s `aria-expanded="true"`. Slušatelj je na `document` u fazi hvatanja, pa `stopPropagation` na samom polju to ne zaustavlja. Pretraga dvorane (`app-venue-search`) je combobox: strelica pomiče aktivnu stavku, Enter je bira. Dok je lista otvorena, ulaz ima `aria-expanded="true"`, a Escape zove `preventDefault` i `stopPropagation`, sklapa listu i ne zatvara modal. Isti `aria-expanded` obrazac drže izbornici u zaglavlju i mobilni filteri.

Ekrani koji čekaju podatke imaju `role="status"` i `aria-live="polite"` na bloku učitavanja, uključujući prvi zaslon aplikacije.
