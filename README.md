# Study Vault

A private workspace where students store, organize and understand their study materials.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router
- **Backend:** Java 21, Spring Boot 3.3, Spring Security, Spring Data JPA
- **Database:** PostgreSQL 16 with Flyway migrations
- **Auth:** BCrypt passwords, JWT in an HttpOnly `SameSite=Strict` cookie, CSRF double-submit token
- **Files:** private local storage behind a `StorageService` interface (swap in S3/GCS later)
- **AI:** Google Gemini, called only from the backend

## Setup

Prerequisites: Java 21, Maven 3.9+, Node 20+, Docker (or any PostgreSQL 14+).

### 1. Database

```bash
export DB_PASSWORD='choose-a-strong-password'
docker compose up -d db
```

(Or create a database `studyvault` and user in your own PostgreSQL.) Flyway creates all tables on first start.

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DB_PASSWORD (same as above) and JWT_SECRET (openssl rand -base64 48)
# optional: GEMINI_API_KEY from https://aistudio.google.com/apikey
mvn spring-boot:run
```

The API runs on http://localhost:8080. `.env` is read from the directory you start the app in (`backend/`). You can also export the same names as real environment variables instead.

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # optional; defaults work
npm install
npm run dev
```

Open http://localhost:5173 and register. The dev server proxies `/api` to the backend so the browser sees one origin, which the secure cookie and CSRF setup require.

### Tests and builds

```bash
cd backend && mvn test            # file-type validation, path traversal protection
cd frontend && npm run build      # type-checks and builds
```

## Configuration (backend/.env)

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | HMAC key, at least 32 characters. The app refuses to start without it |
| `JWT_EXPIRY_HOURS` | Session length (default 12) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional. Without a key the assistant shows a clear "not set up" message and everything else works |
| `STORAGE_DIR` | Where file bytes live (default `./data/files`, outside any web root) |
| `MAX_FILE_MB`, `STORAGE_QUOTA_MB` | Per-file limit (25) and per-user quota (1024) |
| `CORS_ORIGINS` | Allowed origins if the frontend is on another origin |
| `COOKIE_SECURE` | Set `true` behind HTTPS |

## Security notes

- **Ownership:** every file, folder and conversation query is scoped by the authenticated user's id. Another user's ID returns 404, so existence isn't leaked.
- **Files:** stored under server-generated `userId/fileId` keys, never client-supplied names; paths are normalized and checked against the storage root. Uploads are checked against an extension allow-list *and* magic bytes, with size and quota limits. Only PDFs, images and plain text render inline (with `nosniff`); everything else downloads. Files are served only through authenticated endpoints.
- **Sessions:** JWT never touches JavaScript. Changing your password revokes other sessions (token version).
- **CSRF:** cookie-based auth is protected with Spring's CSRF token; the SPA echoes `XSRF-TOKEN` in `X-XSRF-TOKEN`.
- **Rate limiting:** in-memory limits on login/register (per IP), password/delete (per user) and AI messages (per user). Use a shared store if you run several instances, and configure `server.forward-headers-strategy` if you sit behind a proxy so client IPs are correct.
- **Production:** serve frontend and API from the same origin (reverse proxy `/api` to Spring Boot, serve `frontend/dist`), enable HTTPS and `COOKIE_SECURE=true`.

## Project layout

```
backend/   Spring Boot app (controller, service, repository, domain, dto, security, exception, config)
           src/main/resources/db/migration/V1__init.sql
frontend/  React app (pages, components, context, lib/api.ts)
```

## Not yet verified

The frontend type-checks and builds. The backend was written without network access to Maven Central in the authoring environment, so it has **not been compiled or run against PostgreSQL yet**. Run `mvn test` and click through register → create folder → upload → preview → AI chat on your machine and report any compile errors you hit.
