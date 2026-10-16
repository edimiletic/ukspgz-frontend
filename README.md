# UHKS nominacije — frontend

Angular 19. API je odvojeni repo (`backend-uhks`).

Lokalni razvoj: `ng serve` na `http://localhost:4200` (API `http://localhost:3000/api` iz `environment.ts`).

Produkcijski build (Railway / statički hosting) koristi `environment.prod.ts` — trenutno `https://uhks-production.up.railway.app/api`.

## Docker

Build ide s `environment.docker.ts` (`apiUrl: '/api'`). Nginx prosljeđuje `/api` na host `api:3000`.

Ako API već radi na računalu:

```bash
docker compose up --build
```

Otvori `http://localhost:8080`. `extra_hosts` mapira `api` na host.

Cijeli stack (Mongo + API + SPA) iz backend foldera, ako je ovaj repo pokraj njega kao `ukspgz-frontend`:

```bash
docker compose --profile fullstack up --build
```

## Produkcija (odvojeni host od API-ja)

Sesijski kolačić je cross-site. Na API-ju mora biti:

- `CORS_ORIGIN` = točan origin ove aplikacije (`https://...`, bez patha)
- `FRONTEND_URL` = isti origin (invite mailovi)
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`

`withCredentials` je uključen na svim HTTP pozivima.

## Testovi i lint

```bash
npm run lint
npm run test:ci
npm run build
```
