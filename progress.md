# Vegas Unfiltered — Project Progress

Last updated: 2026-10-29

## Project snapshot

Vegas Unfiltered is an editorial Las Vegas publication built with Next.js 16.4.3,
React 19, TypeScript, and Tailwind CSS 4. The project includes a public-facing
publication and an invite-only editorial CMS backed by Supabase.

The application builds and passes lint and TypeScript checks locally. The public
site and admin routes were smoke-tested from a production build. Supabase has
not yet been configured in this environment, so live authentication, database,
storage, and publishing workflows remain unverified.

## What is in place

### Public publication

- Homepage, category sections (`eat`, `drink`, `explore`, `save`, `stories`),
  editorial pages, and article routes.
- Responsive public header/footer, shared article/category components, metadata,
  structured data, robots, sitemap, and site icon.
- Demo stories are stored locally in `src/lib/content.ts`. CMS stories can be
  loaded from Supabase when published and their publication time has arrived.
- Published CMS article content is rendered as validated React nodes rather
  than injected HTML. CMS-backed pages are split into explicit section routes.
- Public and admin route groups have separate layouts, so admin pages do not
  inherit public navigation or footer.

### Editorial CMS

- Invite-only login and protected admin workspace at `/admin`.
- Article list and editor with validated rich text, metadata, categories, media
  selection, autosave/conflict handling, and role-aware review/publishing
  controls.
- Restaurant and restaurant-visit management, private receipt uploads, public
  editorial media, neighborhood editing, team access, SEO status, analytics
  connection status, and settings views.
- Supabase role checks for owner, editor, and contributor; team invitations and
  role changes require the server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Browser-to-Supabase Storage uploads for editorial media and receipts.
- SQL migrations define the CMS schema, row-level security/storage policies,
  publishing actions, and the restricted public receipt-path function:
  - `supabase/migrations/20261030000000_editorial_cms.sql`
  - `supabase/migrations/20261030000001_publishing_actions.sql`

### Documentation and setup

- `.env.example` and `README.md` describe Supabase configuration, owner
  bootstrap, storage/privacy constraints, deployment, and launch content needs.
- Scheduled articles require an external scheduler; scheduled status alone does
  not publish content automatically.
- Analytics and SEO screens are status/audit views, not connected analytics or
  external crawler integrations.
- Optional public receipt images must already be redacted before upload.

## Verification completed

Most recently verified locally:

- `npm run build` — passed with Next.js 16.4.3.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- Production HTTP smoke tests returned 200 for `/`, `/eat`, `/admin`,
  `/admin/articles`, `/admin/login`, `/sitemap.xml`, and `/robots.txt`.
- SSR checks confirmed public chrome appears on public pages and is absent from
  `/admin/articles`.

The smoke-test production server was stopped after verification.

The most recent build issue was caused by dynamic admin authentication and
metadata prerendering. It was resolved by placing an intentional `connection()`
marker inside Suspense in `src/app/(admin)/admin/layout.tsx`. Keep the marker
and admin metadata at the layout boundary if changing the admin route structure.

## Current limitations and risks

1. **No live Supabase validation.** The migrations and RLS/storage policies have
   not been run against a Supabase project or local PostgreSQL instance. The
   admin gracefully shows setup guidance without configuration, but CMS
   workflows are not yet proven end to end.
2. **No production deployment verification.** Vercel environment variables,
   Supabase Auth redirect URLs, domain/DNS, and deployed URLs still need
   configuration and testing.
3. **Content is not publication-ready.** Initial stories are concepts/demo
   content, not firsthand reporting. Replace with fact-checked reporting,
   named authors, accurate dates, and owned/licensed imagery before launch.
4. **Operations need real integrations.** Scheduled publishing needs a monitored
   scheduler. Newsletter, analytics reporting, and advertising/affiliate
   tracking are not connected.
5. **Sensitive receipt handling needs operational care.** Private receipts and
   visit notes must remain restricted; public receipt copies must be redacted
   before upload.
6. **Worktree is uncommitted.** At the time of this update, `git status` reports
   the project files as untracked. No commit was created. Review and preserve the
   existing files; do not assume there is a committed baseline to restore.

## Way forward

### 1. Configure and validate Supabase

- Create/select a Supabase project and populate `.env.local` from `.env.example`
  with the project URL and publishable key.
- Review both migrations, especially RLS policies and storage bucket access,
  before applying them.
- Apply migrations in filename order using Supabase CLI or the SQL editor.
- Create the initial owner using trusted provisioning, set
  `auth.users.raw_app_meta_data.cms_role` to `owner`, and verify the profile
  trigger and login redirect.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server-side secrets. Configure Auth
  site URL and redirect allowlist for local and deployed origins.
- Confirm authenticated access and role restrictions for owner, editor, and
  contributor, including direct server-action calls and Storage access.

### 2. Run end-to-end CMS checks

- Create, edit, autosave, submit for review, approve, publish, and unpublish an
  article; verify public rendering, category feeds, metadata, and sitemap
  behavior.
- Verify contributors cannot approve/publish and cannot read private restaurant
  visit or receipt data.
- Verify restaurant and visit CRUD, private receipt signed URLs, media uploads,
  neighborhood updates, invitations, and role changes.
- Confirm article conflict handling and upload validation with realistic
  browsers/files.
- If scheduled publishing is required, implement and monitor an external
  scheduler before relying on scheduled article status.

### 3. Finish product and launch readiness

- Replace concept content and development artwork with reviewed editorial
  material and owned/licensed images.
- Complete the correction/contact workflow and review privacy, affiliate, and
  editorial disclosures against the services actually enabled.
- Perform keyboard, screen-reader, mobile, and responsive checks on public and
  admin flows.
- Configure Vercel environment variables and the canonical domain; verify
  production auth callbacks, routes, metadata, sitemap, robots, and caching.
- Decide whether newsletter, analytics, advertising, or affiliate integrations
  are in scope; add them only with appropriate consent, privacy, and operational
  handling.
- Add automated coverage for critical permission and publishing transitions
  once the Supabase test environment is available.

## Useful commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

For Supabase setup details and the existing content/SEO safeguards, see
[`README.md`](./README.md).
