# Connect Sphere

Connect Sphere is the public music-software platform for Huskagent Technology Company. LaneuCap DAW is the flagship software. The site includes product/store pages, release information, learning and news pages, support submissions, a cart foundation, and a protected My Sphere account area.

## Run in Replit

The project uses two managed workflows:

- `artifacts/connect-sphere: web` serves the React + TypeScript website.
- `artifacts/api-server: API Server` serves the Express API.

The Replit workflows provide the required `PORT`, `BASE_PATH`, and API routing. Preview the website at the project root. No payment service, newsletter provider, or object-storage service is required to run the site.

## Setup and database

The app uses the Replit PostgreSQL database and Drizzle ORM. To apply the current schema to the development database:

```bash
pnpm --filter @workspace/db run push
```

Production schema changes are applied through Replit's Publish flow. Do not run the development schema push against production.

The API does not seed demo products, articles, lessons, or releases at startup. The public catalogue displays only published database records. Do not add placeholder records to make empty states look populated.

After changing `lib/api-spec/openapi.yaml`, regenerate the typed client and validation schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Authentication and service configuration

Sign-in uses Replit-managed Clerk. Its publishable and secret keys are managed through Replit Secrets; do not add them to source control or place them in frontend code. Passwords and account security are handled by Clerk, not browser storage. Development and production Clerk user stores are separate.

To grant catalogue administration, first have the intended user sign in so their local account row exists. Then promote that Clerk user in the development database using the verified Clerk subject:

```sql
UPDATE users SET is_admin = TRUE WHERE auth_subject = '<Clerk user ID>';
```

Never expose that operation in a public API. The admin API checks both the signed-in Clerk session and the database role. The catalogue screen supports actual product creation and price/status/publication updates.

Support requests and newsletter signups are saved in PostgreSQL. This app does not send support email or newsletter messages. Checkout is disabled because no payment provider is connected; the site does not claim purchases succeeded.

Downloads are shown as available only for published releases with a valid HTTPS URL and a positive configured file size. No LaneuCap installer, VST3 package, documentation file, or previous release is currently configured. There is no release-file upload screen yet; a missing file stays unavailable rather than using a placeholder.

News and learning pages render published database articles and show an empty state when none are configured. Article-authoring screens and video lessons are not included yet. LaneuCap feature claims, compatibility, system requirements, and screenshots remain unpublished unless verified product data is added.

## Quality checks

```bash
pnpm run typecheck
pnpm --filter @workspace/connect-sphere run build
pnpm --filter @workspace/api-server run build
```
