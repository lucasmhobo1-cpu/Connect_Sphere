# Connect Sphere

Connect Sphere is the public website and product hub for Huskagent Technology Company. It presents the LaneuCap DAW and planned audio products, with product discovery, learning and news pages, support submissions, downloads, a cart foundation, and a protected My Sphere account area.

## Run in Replit

The project uses two managed workflows:

- `artifacts/connect-sphere: web` serves the React + TypeScript website.
- `artifacts/api-server: API Server` serves the Express API.

The Replit workflows provide the required `PORT`, `BASE_PATH`, and API routing. Preview the website at the project root.

## Setup and database

The app uses the Replit PostgreSQL database and Drizzle ORM. To apply the current schema to the development database:

```bash
pnpm --filter @workspace/db run push
```

Production schema changes are applied through Replit's Publish flow. Do not run the development schema push against production.

The API seeds a small, idempotent set of published product-concept cards and general music-production guides when it starts. Product concepts are explicitly marked as in development; they have no prices or downloadable builds. The seed process does not overwrite existing products or articles.

After changing `lib/api-spec/openapi.yaml`, regenerate the typed client and validation schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Authentication and service configuration

Sign-in uses Replit-managed Clerk. Its publishable and secret keys are managed through Replit Secrets; do not add them to source control or place them in frontend code. Development and production Clerk user stores are separate.

Support requests are saved in PostgreSQL. Newsletter submissions are saved as a list entry; no email or marketing message is sent by this app. No payment provider is connected, so the cart does not process checkout or claim purchases succeeded.

The download centre reports files as available only when a published release has a configured HTTPS file URL. There are no LaneuCap installers or plugin packages configured at this time. A missing file remains unavailable, not a placeholder download.

## Quality checks

```bash
pnpm run typecheck
pnpm --filter @workspace/connect-sphere run build
pnpm --filter @workspace/api-server run build
```
