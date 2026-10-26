# HelpDesk Client (Angular)

Angular 19 front end for the [HelpDesk API](https://github.com/sttallev99/helpdesk-api).

## How it connects to the API

- All calls go to the relative path `/api/v1/...` (`src/environments/environment.ts`).
- In development, the Angular dev server proxies `/api` to `http://localhost:5146` (the API's `http` launch profile) - see `proxy.conf.json`, wired up in `angular.json` under `serve.options.proxyConfig`. The browser only ever talks to `localhost:4200`, so the API needs no CORS configuration.
- Login/register return a JWT, stored in `localStorage` and attached as `Authorization: Bearer ...` by `core/auth.interceptor.ts`. A `401` on an authenticated call logs the user out. Roles come from `GET /api/v1/auth/me`.
- API errors (`ProblemDetails` / validation errors) are turned into readable messages by `core/problem-details.ts`.

## Running

Prerequisites: Node 20.11+ and the API set up per its README (user secrets, LocalDB).

`npm run api` expects the API checked out next to this folder as `SupportTicketSystem`:

```bash
git clone https://github.com/sttallev99/helpdesk-api.git SupportTicketSystem
git clone https://github.com/sttallev99/helpdesk-client.git
cd helpdesk-client
```

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

## Deployment

Live at **https://wonderful-coast-071eafc0f.3.azurestaticapps.net** (Azure Static Web Apps, Free plan).

### Demo accounts

Shared demo logins for the live site - anyone with this README can use them, so don't put anything private in their tickets.

| Role | Email | Password |
|---|---|---|
| Customer | `customer@helpdesk.app` | `Customer123!` |
| Agent | `agent@helpdesk.app` | `Agent1234!` |

Try both sides: raise a ticket as the customer, then log in as the agent to claim it, reply or add an internal note, and change its status. You can also register your own customer account. The admin account isn't shared.

The first request after a quiet period can take 30-60 seconds while the free-tier API and database wake up.

- `npm run build` is a production build: `angular.json` swaps in `src/environments/environment.prod.ts`, which points `apiBaseUrl` at the API on Azure App Service (`https://helpdesk-api-sttallev99.azurewebsites.net/api/v1`). The API allows this site's origin through its `Cors:AllowedOrigins` setting.
- `public/staticwebapp.config.json` rewrites unknown paths to `index.html`, so deep links like `/tickets/<id>` work.
- `.github/workflows/deploy.yml` builds and uploads `dist/helpdesk-client/browser` on every push to `main`, using the `AZURE_STATIC_WEB_APPS_API_TOKEN` repository secret.
- If the API moves, update `environment.prod.ts` and the API's `Cors__AllowedOrigins__0` app setting together.
