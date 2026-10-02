# LouvorApp backend

Flask API for LouvorApp. Local development continues to use SQLite; production
uses PostgreSQL, Alembic migrations, and Gunicorn. The repository does not
contain provider credentials or assume a specific hosting provider.

## Local development and tests

Copy `.env.example` to `.env` and generate a private JWT key:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set `JWT_SECRET_KEY` in the ignored `.env`. `JWT_EXPIRES_MINUTES` must be from
1 to 1440. `CORS_ORIGINS` is a comma-separated list of trusted frontend
origins. Never commit `.env`, tokens, signing keys, database URLs, or backups.
Rotating the JWT key invalidates existing tokens.

The musical assistant uses the OpenAI Chat Completions API. Set `AI_API_KEY`
only in the backend `.env` for local development and in the hosting provider's
secret manager for production. Optionally set `AI_MODEL` (default:
`gpt-4o-mini`). The key is never sent to or bundled with the React frontend.
Authenticated users can ask questions; each request is limited to 10 messages
of at most 2,000 characters, has a 25-second provider timeout, and does not
store conversations in this application. Only matching song metadata (title,
artist, key, BPM, and category) is sent as catalog context; lyrics and member
data are not sent. Disable or rotate the provider key if the feature should be
paused. Requests are sent to the AI provider, so users should not enter
passwords, tokens, or other confidential information.
If the provider key is missing or the provider is unavailable, the assistant
answers common music-theory questions locally and identifies this fallback in
the response; configure a key for broader AI-generated answers.

Vocal analysis is performed in the user's browser with Web Audio; recordings
are not uploaded or stored. Recording requires microphone permission and a
secure browser context (HTTPS or localhost); an audio file up to 15 MB and 20
seconds can also be analyzed locally. Only the detected note/frequency range
and approximate voice-region estimate are sent to the authenticated assistant
if the user explicitly requests an explanation. Results and suggested keys are
orientative: one short recording cannot determine a voice classification or
comfortable tessitura.

Run the isolated regression suite from this directory:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Unauthenticated access is limited to `POST /api/cadastro` and `POST
/api/login`. Other API routes require a bearer JWT. Administrative operations
check the current database role; members can create songs, while editing or
deleting songs, managing events and schedules, and publishing team-wide notices
remain administrator-only. Members can access only their own private schedule
and notifications. Debug mode must remain disabled outside local development.

Administrators can publish team-wide notices from the notifications page;
notices can include a location. Song records also support an optional location,
and event records already include one. Production schema updates are applied
with Alembic (`flask --app wsgi:app db upgrade`); local SQLite startup adds
these optional columns without replacing existing data.

## Production configuration

1. Provision an empty PostgreSQL database and a Python web service with outbound
   access to it. Enable TLS for the frontend and API. Keep the existing SQLite
   file as the untouched migration source.
2. Configure backend environment variables in the hosting provider's secret
   settings (not in Git):

   | Variable | Production value |
   | --- | --- |
   | `APP_ENV` | `production` |
   | `JWT_SECRET_KEY` | Fresh random secret, at least 32 bytes |
   | `JWT_EXPIRES_MINUTES` | Integer from `1` to `1440` |
   | `AI_API_KEY` | OpenAI API key stored only as a backend secret |
   | `AI_MODEL` | Optional model name; defaults to `gpt-4o-mini` |
   | `DATABASE_URL` | Provider PostgreSQL URL; use `postgresql://...` or `postgres://...` |
   | `DATABASE_SSLMODE` | `require` |
   | `CORS_ORIGINS` | Exact HTTPS frontend origin(s), comma separated, no trailing slash |
   | `AUTO_CREATE_SQLITE_SCHEMA` | `false` |
   | `FLASK_DEBUG` | `false` or unset |
   | `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | Tune to the provider's connection limit |

   Production refuses SQLite and PostgreSQL connections without TLS. The
   process pool can use up to `workers * (pool size + max overflow)`
   simultaneous database connections; set those values below the provider's
   limit, including connections reserved for migrations and administration.
3. Install `requeriments.txt` in the Linux service. Before routing traffic,
   apply the database schema once:

   ```sh
   flask --app wsgi:app db upgrade
   ```

   Start the web service with the included `Procfile` (Gunicorn binds to the
   host-provided `PORT`). Do not run `db upgrade` separately in every worker.
   The health check `GET /health` reports whether the database is reachable.
4. Configure the frontend build environment **before** building:
   - For separate frontend and API hosts, set `VITE_API_URL` to the public API
     origin, for example `https://api.example.com`, without a trailing slash.
     The API host must allow that exact frontend origin in `CORS_ORIGINS`.
   - For same-origin hosting, leave `VITE_API_URL` empty and configure the web
     host to proxy `/api` and `/health` to Flask. The static host must also
     return the frontend entry page for client-side routes.
   - Build/deploy the frontend from `LouvorApp/frontend` with `npm ci` and
     `npm run build`. Vite embeds `VITE_API_URL` into the generated assets;
     changing it requires a new frontend build.

## SQLite to PostgreSQL migration

The migration tool reads SQLite in read-only mode, keeps the source untouched,
requires the PostgreSQL schema to have been upgraded, and refuses a destination
that contains application data. It validates the full copy in a PostgreSQL
transaction and can roll that transaction back as a preflight. Back up the
SQLite file independently as well.

First configure the production `DATABASE_URL` in the environment and run a
preflight from the backend directory:

```sh
python migrate_sqlite_to_postgres.py
```

This reads and copies the source into a transaction that is always rolled back;
it prints validated table counts only if the destination can accept the data.
Review the result and confirm the backup destination is new, private, and has
enough disk space. Then execute the actual copy, which creates and verifies a
separate SQLite backup before committing PostgreSQL:

```sh
python migrate_sqlite_to_postgres.py \
  --backup-path /secure-backups/louvor-before-postgres.sqlite3 \
  --confirm
```

Run it only once against the intended empty destination. If a table has
conflicting IDs, invalid references, duplicates, or incompatible data, the
transaction is rolled back; resolve the reported data issue before retrying.
Do not delete or overwrite the source SQLite database. Verify `/health`, log
in, and check representative members, events, scales, songs, and notifications
before switching production traffic.

## Online smoke test

After deployment, request `https://<api-host>/health`; expect HTTP 200 and
`{"status":"ok","database":"conectado"}`. Then use the deployed frontend to
log in and load the songs and agenda pages. In browser developer tools, verify
that API requests go to the configured HTTPS API origin, include the bearer
token where required, and return no CORS errors. Do not put real credentials or
tokens in shared logs or screenshots.
