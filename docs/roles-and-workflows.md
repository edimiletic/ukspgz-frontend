# Roles, nominations, and travel orders

How the portal decides who can manage the calendar, nominate officials, review travel orders, and administer users. The checks below are what the Angular client enforces. Hiding a button does not replace an API rejection of the same action.

## Where the rules live

| Concern | Code |
| --- | --- |
| Role names, competition catalog, caps, permission helpers | `src/app/model/roles.ts` |
| Login normalization (`role` vs `roles[]`) | `src/app/services/login.service.ts` (`AuthService`) |
| Admin user form | `src/app/components/users/user-form-modal/` and `users.helpers.ts` |
| Game create / edit / nominate | `src/app/components/games-assigned/` |
| Travel orders | `src/app/services/travel-expense.service.ts`, `expenses/`, `expense-report-details/` |
| Route access | `src/app/app.routes.ts` and `src/app/guards/` |

Routes other than `/login` and the app shell are lazy-loaded. The shell requires `AuthGuard`. `/users` requires `AdminGuard`. `/statistics` requires `StatisticsGuard`. `/eligible-officials` requires `EligibleOfficialsGuard`. On the server those guards allow the request through; the browser re-checks the session.

## Role model

A user can hold more than one role. Each entry is `{ name, competitions }`.

| Role | What it is for |
| --- | --- |
| `Admin` | Unrestricted calendar, nominations, reviews, statistics, and `/users` |
| `Sudac`, `Delegat`, `Kontrolor` | Field assignment roles. `Kontrolor` is still assigned on a game. The old Kontrola grading screens are gone. |
| `Povjerenik natjecanja` | Calendar for the competitions listed on that role, plus travel-order review |
| `Povjerenik za službene osobe` | Nominates `Sudac`, `Delegat`, and `Kontrolor` on those competitions |

`AuthService.normalizeUser` rewrites the session user on login and on `GET /api/me`:

- `roles` becomes the normalized assignment list.
- `role` becomes `pickPrimaryRole`: `Admin` if present, otherwise the first field role (`Sudac`, `Delegat`, `Kontrolor`), otherwise the first assignment. An empty list falls back to `Sudac`.

A payload with `role: "Sudac"` and `roles` containing `Admin` is an admin. `isAdminUser` looks at the assignment list, not the legacy `role` string alone. Do not branch UI on `user.role === 'Admin'`.

`normalizeRoleAssignments` drops unknown role names. Competition strings are canonicalized (`FAVBET PREMIJER LIGA` becomes `SuperSport Premijer liga`) and then kept only if they are in `ALL_COMPETITIONS`:

- SuperSport Premijer liga
- PRVA MUŠKA LIGA
- PREMIJER ŽENSKA LIGA
- KUP «K. ĆOSIĆ»
- KUP «R. MEGLAJ-RIMAC»

`COMPETITION_RANK` still knows youth and lower leagues. Those ranks feed the nomination cap. They are not commissioner competitions and they are stripped if stored on a role assignment.

### Empty competition lists

In the helpers, a commissioner assignment with `competitions: []` means every competition (`userHasRoleForCompetition`, `getManagedCompetitions` returns `null`, calendar returns `ALL_COMPETITIONS`). The user form no longer saves that shape: a commissioner must have at least one competition. Treat an empty list as legacy data, not as a form option.

`Admin` ignores competition lists and always passes competition-scoped checks.

## Who can do what

| Capability | Who |
| --- | --- |
| Create a game (`canManageCalendar()` with no competition) | Admin, or anyone who has `Povjerenik natjecanja`. The create button is on the games page; the modal then treats create mode as calendar-editable. |
| Edit schedule or delete one game | Admin, or `Povjerenik natjecanja` whose list includes that competition (empty list: all). Schedule inputs stay disabled for everyone else, and `updateGame` skips the game patch unless `canManageCalendar()` is true. |
| Open a future game to change nominations | Admin, or `Povjerenik za službene osobe` for that competition (`canEditGame` is calendar **or** nominate) |
| Edit a game whose date is already in the past | Admin only |
| See every game, every absence, and every travel order | Admin, or either commissioner role (`canSeeAllGames`) |
| Approve or reject a travel order | Admin, or `Povjerenik natjecanja`, and only when the viewer is not the owner |
| Statistics and the statistics nav item | Admin or either commissioner |
| Eligible-officials list | Admin or either commissioner |
| `/users` | Admin only. An admin cannot delete their own row. |
| Filter "Odgovori na nominacije" | Admin or `Povjerenik za službene osobe` |

Sidebar items for Korisnici, Osobe za nominaciju, and Statistika follow the same helpers. Other items (home, games, absence, expenses, documents, exams) are visible to every signed-in user. List screens still narrow the data: field officials load their own absences and `GET /api/travel-expense/my`; commissioners and admins load the full lists.

Denied guard navigations go to `/home` with `error=access_denied` and a Croatian `message` query param.

## User form constraints

`/users` posts `POST /api/users` and `PUT /api/users/:id`. The modal blocks save before the request when:

- Any required profile field is empty. Email must pass Angular's email validator. The inline error names the missing fields.
- No role is selected.
- The selection hits `INCOMPATIBLE_ROLE_PAIRS`: `Sudac`+`Delegat`, `Sudac`+`Kontrolor`, `Delegat`+`Kontrolor`, `Sudac`+`Povjerenik natjecanja`. `Sudac` may also be `Povjerenik za službene osobe`. `Delegat` may also be `Povjerenik natjecanja`.
- A commissioner role has no competition ticked.
- Taking those competitions would leave the current holder with no roles at all. The holder stays in the system; give them another role, or leave them one competition, then take the league. A holder who keeps another role, or another competition of the same commissioner role, can be replaced. The note under the checkbox says who holds it now.
- `Sudac` has no `rang`. Allowed values are `Državni sudac` and `Županijski sudac`. Rank is cleared when `Sudac` is not selected.
- `Sudac`, `Delegat`, or `Kontrolor` has no `najvisaLiga`. The cap is cleared when none of those roles is selected. The list column shows it as **Teren**. Commissioner competitions show as **Nadzor** (`Sva natjecanja` when `getManagedCompetitions` is `null`).
- Create has an empty password, or any provided password is shorter than 8 characters. Edit leaves the password unchanged when the field is blank.

Only one user should hold a given commissioner role for a given competition. Occupancy is computed from the users already loaded on the page, excluding the user being edited.

Server errors are shown from `error.error` string, then `error.error.error`, then `error.error.message` (`apiErrorMessage`).

## Nominating officials

The edit-game modal shows the nomination step only when `canNominateOfficials` is true for the selected competition. Admins can nominate. A commissioner cannot nominate their own user id (`cannotNominateSelf`); an admin can.

An official is offered only when `isWithinNominationCap` passes: `COMPETITION_RANK[competition] <= COMPETITION_RANK[najvisaLiga]`. A missing cap or a missing competition does not filter them out. `FAVBET PREMIJER LIGA` ranks as SuperSport (100).

`isEligibleForCompetition` (eligible-officials style check) also requires a field role. `Sudac` and `Delegat` are eligible for any competition inside the cap. `Kontrolor` is eligible only for `TOP_PROFESSIONAL_COMPETITIONS`, which is the same five names as `ALL_COMPETITIONS`.

Teams offered for a competition come from the catalog via `teamEligibleForCompetition`:

- Direct membership, after the FAVBET alias.
- KUP «K. ĆOSIĆ» also accepts clubs in SuperSport, FAVBET, or PRVA MUŠKA LIGA.
- KUP «R. MEGLAJ-RIMAC» also accepts PREMIJER ŽENSKA LIGA clubs.

A `Kontrolor` slot is required (`isKontrolorRequired`) for every SuperSport game, and for KUP «K. ĆOSIĆ» only when both clubs are SuperSport/FAVBET clubs. Other games keep the slot optional. The heading switches between "obavezno" and "opcionalno".

Availability, once date and time are set:

- An absence covering that calendar day removes the official.
- Another `Accepted` or `Pending` assignment removes them when kickoff times are under 60 minutes apart (`timesOverlap`; a gap of exactly 60 minutes does not overlap) and the existing game's rank is greater than or equal to the new game's rank (`isBlockingScheduleConflict`). A lower-ranked game does not block a higher-ranked one.

## Travel orders

Client calls in `TravelExpenseService` (base URL is `environment.apiUrl`):

| Call | Use |
| --- | --- |
| `GET /travel-expense/template` | Download `Putni nalog HKS.xls` |
| `GET /travel-expense/eligible-games` | Games the current user may attach |
| `POST /travel-expense` | Multipart create |
| `GET /travel-expense/my` | Own orders |
| `GET /travel-expense` | All orders (admin and both commissioner roles) |
| `GET /travel-expense/:id` | Detail |
| `PATCH /travel-expense/:id/review` | `{ action: "approve" \| "reject", reviewComments }` |
| `DELETE /travel-expense/:id` | Delete |
| `GET /travel-expense/:id/files/:kind` | `nalog`, `fuel`, or `toll` |

The create form requires a game, a travel order file (`.xls`, `.xlsx`, or `.pdf`), and a fuel receipt PDF. If "autocesta" is checked, a toll receipt PDF is required too. Fields posted: `gameId`, `usedHighway`, `nalog`, `fuelReceipt`, and optionally `tollReceipt`.

List sections are the Croatian states `Predano`, `Odbijeno`, and `Potvrđeno`. Home also styles a `Skica` state if the API returns one. Overview screens default the role filter to `Sudac`.

Review buttons show only for `Predano` when the viewer is an admin or `Povjerenik natjecanja` and is not the report owner. `Povjerenik za službene osobe` can open the full list and cannot review. Delete is available to admins always, and to the owner only when the state is `Odbijeno`. The rejected-state warning tells the owner to submit a new order with the same "Novi putni nalog" form.

`getTravelExpenseRate(from, to)` looks up the 2025/26 per-diem table in `travel-expense-rates.ts` (return trip included) and falls back to the reverse city pair. A missing pair returns `null`.

Approving or rejecting should produce `EXPENSE_APPROVED` or `EXPENSE_REJECTED`. `notificationTargetRoute` sends the user to `/expenses/:id` when `travelExpenseId` is set, otherwise to `/assigned` when `gameId` is set.

## Auth session

`POST /api/login` stores the JWT in `localStorage` under `token`. The interceptor adds `Authorization: Bearer` on every browser request except `/login`. A `401` clears the session only when that header was sent, then navigates to `/login`.

`isAuthenticated` base64-decodes the payload and drops the token when `exp` is in the past or the token is not a three-part JWT. It does not verify the signature. `getCurrentUser()` returns the in-memory user when present; otherwise it calls `GET /api/me`.

## Local setup and CI

```bash
npm ci
npm start          # ng serve, development config, http://localhost:4200
npm test           # Karma, watch mode, Chrome
npm run test:ci    # single run, ChromeHeadlessCI
npm run build      # production configuration, file-replaces environment.ts
```

CI (`.github/workflows/ci.yml`) runs on every push and pull request: Node 20, `npm ci`, `npm run test:ci`, `npm run build`. The headless launcher needs the flags in `karma.conf.js`.

`ng serve` uses the development configuration, so it keeps `environment.ts` (`http://localhost:3000/api`). `ng build` defaults to production and swaps in `environment.prod.ts`.

## Pitfalls

- Dual-role admins must stay admins after normalization. A regression that trusts the legacy `role` field hides `/users` and review actions for people who are both `Sudac` and `Admin`.
- Commissioner permission is per competition. A helper call without a competition argument (`canManageCalendar()`, `canNominateOfficials()`) is true for any holder of that role, which is why the "create game" button is broader than per-game edit.
- Saving a commissioner used to allow "all competitions" via an empty array. The form now rejects that. Helpers still treat empty arrays as unrestricted so older records keep working.
- Rank and `najvisaLiga` are required only for the roles that use them, and the payload clears them when those roles are unchecked. Leaving stale values on the user breaks the cap.
- The nomination cap compares ranks. SuperSport and KUP «K. ĆOSIĆ» are both 100, so a SuperSport cap does not exclude that cup. A cap of PRVA MUŠKA LIGA (80) excludes SuperSport.
- `timesOverlap` uses a strict less-than 60 minutes. Games exactly one hour apart are not a conflict.
- Past games are read-only for commissioners. Only an admin can open them for edit.
- Expense review is not "anyone who can see all expenses". The officials commissioner sees the list and does not get approve/reject.
- Guards and list filtering are browser-side. SSR renders the shell without applying them.
