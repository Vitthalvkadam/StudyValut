Study Vault

A private workspace where students store, organize and understand their study materials. Upload notes, slides and photos, keep them in nested folders, preview them in the browser, and ask an AI assistant questions about them.

What's in the app
Page	What it does
Login / Register	Create an account or sign in. Passwords are hashed; sessions use a secure cookie.
Dashboard	Real statistics (files, folders, favorites, storage used), your top folders and your most recent files. A new account sees empty states, not sample data.
My Vault	Browse folders and files. Create, rename, recolor and delete folders (nested). Upload files, drag and drop, or take a photo with the camera. Search, sort, favorite, rename, move, download and delete files.
Folder view	The same page inside a folder, with breadcrumbs and uploads that land in that folder.
File viewer	Preview PDFs, images and text files in the browser. Other types (Word, PowerPoint, Excel) offer a download.
Study Assistant	Chat with an AI model. Attach a PDF or image from your device or from your vault. Conversations are saved and can be reopened or deleted.
Settings	Edit your profile, change your password (signs out other devices), or delete your account and all its data.

Supported uploads: PDF, PNG, JPG, GIF, WebP, TXT, MD, CSV, DOC/DOCX, PPT/PPTX, XLS/XLSX (up to 25 MB each, 1 GB per user by default).

Tech stack

Frontend

React 18 + TypeScript, built with Vite
Tailwind CSS (cream/mustard palette, Fraunces and Figtree fonts)
React Router for pages and protected routes
lucide-react icons

Backend

Java 21, Spring Boot 3.3
Spring Security (authentication, CSRF, CORS)
Spring Data JPA (Hibernate)
JJWT for tokens, BCrypt for password hashing

Data

PostgreSQL 16 for users, folders, file metadata, favorites and chat history
Flyway for versioned database migrations
Local private disk storage for file contents, behind a StorageService interface so S3 or Google Cloud Storage can be added later

AI

OpenRouter (OpenAI-compatible API), called only from the backend, so the key never reaches the browser
How it works
Browser (React)  ──/api──▶  Spring Boot  ──▶  PostgreSQL   (metadata, users, chats)
                                │
                                ├──▶  Private disk storage (file bytes)
                                └──▶  OpenRouter API (AI answers)

Sign-in. On login the server checks the BCrypt hash and sets a JWT in an HttpOnly, SameSite=Strict cookie. JavaScript can't read it. Every write request must also carry a CSRF token that the app copies from a cookie into the X-XSRF-TOKEN header. Changing your password bumps a token version, which signs out your other sessions.

Privacy. Every folder, file and conversation query includes the signed-in user's id. Asking for someone else's item returns "not found", so nothing leaks, not even whether it exists.

Uploading. The server checks the extension against an allow-list, checks the file's first bytes match that type (so a renamed program can't pass as a PDF), enforces the size limit and your quota, then saves the bytes under a server-generated key like userId/fileId. Names you send are never used as paths. A database row records the name, type, size and folder.

Viewing and downloading. Files are never served from a public folder. Each preview or download goes through an authenticated endpoint that checks ownership. Only PDFs, images and plain text display inline; everything else downloads.

Deleting. Deleting a folder removes its subfolders and files in the database, and the file bytes are deleted from disk after the database change commits, so a failure can't leave orphans.

AI assistant. When you send a message, the server loads the last 20 messages of that conversation, adds your question and any attached PDF or image (up to 10 MB), and sends it to OpenRouter. The reply and your message are saved to PostgreSQL. A vault file you attach is checked for ownership first. If no API key is configured, the assistant page says so and the rest of the app works normally.

Abuse limits. Login and registration are rate-limited per IP; password changes, account deletion and AI messages per user.

Run it locally

Prerequisites: Java 21, Maven 3.9+, Node 20+, Docker (or any PostgreSQL 14+).

1. Database

bash
export DB_PASSWORD='choose-a-strong-password'
docker compose up -d db

2. Backend

bash
cd backend
cp .env.example .env
# Edit .env: set DB_PASSWORD (same as above) and JWT_SECRET (openssl rand -base64 48).
# Optional AI: set OPENROUTER_API_KEY from https://openrouter.ai/keys
mvn spring-boot:run

The API starts on http://localhost:8080 and Flyway creates the tables on first start.

3. Frontend

bash
cd frontend
cp .env.example .env     # optional
npm install
npm run dev

Open http://localhost:5173 and register. The dev server forwards /api to the backend so the browser sees a single origin, which the cookie and CSRF setup need.

Tests and builds

bash
cd backend && mvn test        # file-type validation, path-traversal protection
cd frontend && npm run build  # type-checks and builds
Configuration (backend/.env)
Variable	Purpose
DB_URL, DB_USER, DB_PASSWORD	PostgreSQL connection
JWT_SECRET	Signing key, at least 32 characters. The app won't start without it
JWT_EXPIRY_HOURS	Session length (default 12)
OPENROUTER_API_KEY, OPENROUTER_MODEL	Optional. Default model is openai/gpt-4o-mini. Pick a model that accepts images/PDFs if you want to attach them
STORAGE_DIR	Where file bytes are stored (default ./data/files)
MAX_FILE_MB, STORAGE_QUOTA_MB	Per-file limit (25) and per-user quota (1024)
CORS_ORIGINS	Allowed origins if the frontend is on a different origin
COOKIE_SECURE	Set true when served over HTTPS

Never commit .env. Only the .env.example files with placeholders belong in version control.

Going to production
Serve the built frontend (frontend/dist) and the API from the same origin, for example with a reverse proxy that sends /api to Spring Boot.
Use HTTPS and set COOKIE_SECURE=true.
If you run more than one server instance, replace the in-memory rate limiter with a shared store, and set server.forward-headers-strategy when behind a proxy so client IPs are correct.
Back up both the PostgreSQL database and the storage directory.
Project layout
backend/
  src/main/java/com/studyvault/
    controller/   REST endpoints (auth, account, folders, files, chat, dashboard)
    service/      business rules, file validation, storage, AI client
    repository/   Spring Data JPA repositories
    domain/       JPA entities (User, Folder, StoredFile, Conversation, Message)
    dto/          request and response shapes
    security/     JWT, session cookie, auth filter, rate limiter
    config/       security and configuration properties
    exception/    centralized error handling
  src/main/resources/db/migration/V1__init.sql
frontend/
  src/pages/        Login/Register, Dashboard, Vault, FileViewer, Assistant, Settings
  src/components/   layout, cards, dialogs, uploads, camera
  src/lib/api.ts    API client
Status

The frontend type-checks and builds. The backend has not yet been compiled or run against PostgreSQL in the environment where it was written, so run mvn test and click through register, create folder, upload, preview and AI chat on your machine, and fix anything that comes up.
