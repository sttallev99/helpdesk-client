# HelpDesk Client (Angular)

Angular 19 front end for the HelpDesk API in [`../SupportTicketSystem`](../SupportTicketSystem).

## How it connects to the API

- All calls go to the relative path `/api/v1/...` (`src/environments/environment.ts`).
- In development, the Angular dev server proxies `/api` to `http://localhost:5146` (the API's `http` launch profile) - see `proxy.conf.json`, wired up in `angular.json` under `serve.options.proxyConfig`. The browser only ever talks to `localhost:4200`, so the API needs no CORS configuration.
- Login/register return a JWT, stored in `localStorage` and attached as `Authorization: Bearer ...` by `core/auth.interceptor.ts`. A `401` on an authenticated call logs the user out. Roles come from `GET /api/v1/auth/me`.
- API errors (`ProblemDetails` / validation errors) are turned into readable messages by `core/problem-details.ts`.

## Running

Prerequisites: Node 20.11+ and the API set up per its README (user secrets, LocalDB).

```bash
npm install
npm run dev:all   # starts the API (dotnet run, http profile) and the Angular dev server together
# or separately:
npm run api       # API on http://localhost:5146
npm start         # client on http://localhost:4200
```

Open `http://localhost:4200`. Log in with the seeded admin (`SeedAdmin:*` user secrets) or register a new customer.

## Features by role

| Role | Pages |
|---|---|
| Customer | My tickets (filter + paginate), create ticket, ticket detail (edit while open, reply, reopen when Resolved/Closed) |
| Agent | All tickets with "unassigned only" / "assigned to me" filters, claim, change status, public replies and internal notes |
| Admin | Everything agents can do, plus assign tickets, the Admin page (report summary, change user roles, manage categories) |

Role checks in the client (`core/auth.guards.ts`, hidden buttons) are UX only; the API enforces all authorization.

## Layout

```
src/app/
  core/    models (mirror the API DTOs), AuthService, auth interceptor + guards, HelpDeskApiService
  pages/   login, register, ticket-list, ticket-new, ticket-detail, admin
```

## Production

`npm run build` outputs static files to `dist/helpdesk-client/browser`. Serve them from the same origin as the API (or behind a reverse proxy that routes `/api` to it); otherwise you'd need to add a CORS policy to the API and set `apiBaseUrl` to the API's absolute URL.
