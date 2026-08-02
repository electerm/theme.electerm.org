# Development & Technical Details

This document covers the architecture, local development setup, deployment,
database schema, and API of **theme.electerm.org**. End users do not need any
of this — it is intended for contributors and maintainers.

The app screenshot lives alongside this file at [`screenshot.jpg`](./screenshot.jpg).

## Tech Stack

- **Backend**: Cloudflare Workers + [Hono](https://hono.dev)
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: GitHub OAuth (popup flow) + JWT sessions ([jose](https://github.com/panva/jose))
- **Frontend**: Vanilla JS (ESM) + [Pug](https://pugjs.org) templates + [Stylus](https://stylus-lang.com) CSS
- **Build**: [esbuild](https://esbuild.github.io) (JS) + Stylus (CSS) + Pug (HTML)
- **Dev Server**: Express (hot reload) + Wrangler (API proxy)
- **Advertising**: [EthicalAds](https://www.ethicalads.io/)

## Features

- **Theme Editor** — Visual color picker + text editor with live iframe preview
- **Live Preview** — Real-time theme preview using the electerm demo site (via postMessage)
- **GitHub Login** — Dedicated login page with terms agreement; popup-based OAuth flow
- **Theme Management** — Save, edit, publish/unpublish themes (max 10 per user)
- **Theme Gallery** — Browse public themes with color preview cards and author info
- **Theme Details** — View, like, copy config, edit, share to social media
- **User Profile** — View owned themes and liked themes
- **Meta Stats** — Site-level statistics (total themes, users, likes)
- **Legal Pages** — Privacy Policy and Terms of Use

## Quick Start

### Prerequisites

- Node.js 18+
- A GitHub OAuth app (see below)
- Cloudflare Wrangler (`npm i -g wrangler` or use the local dev dependency)

Install dependencies:

```bash
npm install
```

### Development

1. Copy `.sample.env` to `.env` and fill in your GitHub OAuth credentials:

   ```bash
   cp .sample.env .env
   ```

2. Create `.dev.vars` for local Wrangler secrets:

   ```
   GITHUB_CLIENT_SECRET=your_secret
   SERVER_SECRET=your_server_secret
   GITHUB_CALLBACK_URL=http://127.0.0.1:5678/api/github-login-callback
   ENVIRONMENT=development
   SITE_URL=http://127.0.0.1:5678
   ```

3. Apply the database migration locally:

   ```bash
   npm run db:migrate
   ```

4. Start both dev servers (Express + Wrangler):

   ```bash
   npm start
   ```

   - Express dev server: `http://127.0.0.1:5678`
   - Wrangler API server: `http://127.0.0.1:26789`
   - Demo site (electerm-web-demo): `http://127.0.0.1:5580`

### GitHub OAuth Setup

Create a GitHub OAuth App at <https://github.com/settings/developers>:

- **Homepage URL**: `http://127.0.0.1:5678` (dev) or `https://theme.electerm.org` (prod)
- **Authorization callback URL**: `http://127.0.0.1:5678/api/github-login-callback` (dev) or `https://theme.electerm.org/api/github-login-callback` (prod)

Set the Client ID and Secret in `.env` / `.dev.vars`.

### Production Deployment

1. Build static files:

   ```bash
   npm run build
   ```

2. Apply the migration to the remote D1:

   ```bash
   npm run db:migrate:remote
   ```

3. Set production secrets:

   ```bash
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put SERVER_SECRET
   ```

4. Deploy:

   ```bash
   npm run deploy
   ```

## Database Schema

All tables live in a single D1 (SQLite) database. There are no foreign-key
constraints — cross-table references are resolved in application code.

### users

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| github_id | TEXT UNIQUE | GitHub user ID |
| github_handle | TEXT | GitHub username |
| name | TEXT | Display name |
| email | TEXT | Email |
| avatar_url | TEXT | Avatar URL |
| role | TEXT | user \| admin |
| status | TEXT | active \| disabled |
| theme_ids | TEXT (JSON) | Array of owned theme IDs |
| liked_theme_ids | TEXT (JSON) | Array of liked theme IDs |
| liked_themes_count | INTEGER | Count of liked themes |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### themes

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| user_id | TEXT | Owner user ID |
| name | TEXT | Theme name |
| theme_config | TEXT (JSON) | Terminal color config |
| ui_theme_config | TEXT (JSON) | UI color config |
| is_public | INTEGER | 0 (private) \| 1 (public) |
| like_count | INTEGER | Number of likes |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### meta

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT PK | Meta key |
| value | TEXT | Meta value |
| updated_at | TEXT | ISO timestamp |

Meta keys: `total_themes`, `total_users`, `total_likes`, `public_theme_ids`

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/login-url` | - | Get GitHub OAuth URL |
| GET | `/api/github-login-callback` | - | OAuth callback |
| GET | `/api/auth/popup-done` | - | Popup relay page |
| GET | `/api/auth/logout` | - | Logout |
| GET | `/api/me` | Required | Get current user profile |
| GET | `/api/themes` | Optional | List public themes (includes owner info) |
| GET | `/api/themes/:id` | Optional | Get single theme (includes owner info) |
| POST | `/api/themes` | Required | Create theme |
| PUT | `/api/themes/:id` | Required | Update theme |
| DELETE | `/api/themes/:id` | Required | Delete theme |
| POST | `/api/themes/:id/publish` | Required | Publish/unpublish theme |
| POST | `/api/themes/:id/like` | Required | Like/unlike theme |
| GET | `/api/themes/user/mine` | Required | List user's themes |
| GET | `/api/meta` | - | Get site meta info |

## Pages

- `/` — Theme editor with live preview
- `/themes/` — Public theme gallery
- `/theme/:id` — Theme detail page
- `/user/` — User profile (auth required)
- `/login/` — GitHub login (accepts `?redirect=` to return after sign-in)
- `/privacy/` — Privacy Policy
- `/terms-of-use/` — Terms of Use

## Theme Config Format

Theme config uses a `key=value` text format:

```
main=#121214
main-dark=#000000
main-light=#2E3338
text=#dddddd
primary=#08c
terminal:foreground=#bbbbbb
terminal:background=#20111b
terminal:cursor=#b5bd68
...
```

- UI colors: `main`, `main-dark`, `main-light`, `text`, `text-light`, `text-dark`, `text-disabled`, `primary`, `info`, `success`, `error`, `warn`
- Terminal colors: prefixed with `terminal:` — `foreground`, `background`, `cursor`, `cursorAccent`, `selectionBackground`, `black`...`white`, `brightBlack`...`brightWhite`

## Project Layout

```
src/
├── data/          # i18n + site/nav/footer/meta configuration (JS)
├── docs/          # this document + app screenshot
├── js/            # client-side ESM (pages, parts, lib)
├── scripts/       # build (pages/styles/js/static) + dev server
├── static/        # robots.txt, llm.txt, webmanifest, favicon
├── styles/        # Stylus sources (parts + responsive)
├── views/         # Pug templates (layout, parts, pages)
└── worker/        # Cloudflare Worker (Hono): routes, db, auth, http
migrations/        # D1 SQL migrations
```
