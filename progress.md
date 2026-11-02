# Vegas Unfiltered — Project Progress

Last updated: 2026-11-02

## Project snapshot

SEO/About update: owner-approved first-person About copy now emphasizes being a
dad and husband, frustration with expensive Strip-focused coverage, and honest
value-conscious reviews. No names or social profiles were supplied or invented.
Added AboutPage/breadcrumb structured data, search-focused page titles and
descriptions, a generated 1200×630 PNG social preview, and a brand-image fallback
for CMS reviews without photos. Live Search Console/domain checks are not part
of local validation.

Vegas Unfiltered is a firsthand restaurant and activity review site built with
Next.js 16.4.3, React 19, TypeScript, and Tailwind CSS 4. One review brings
together the experience, food/drinks or activity, cost, personal story, and
verdict. The public navigation is Restaurants, Activities, and About Us.

Hardcoded demo articles, fallback review cards, and demo category illustrations
have been removed. Public review routes, feeds, metadata, sitemap, and SEO audit
now use CMS records only. Empty feeds show a no-reviews state; former demo
article URLs are not found unless a real published review uses that slug.
No hosted CMS records were deleted. The general homepage illustration remains
site artwork rather than a claimed photo of a reviewed place.

The application passes the production build, lint, and TypeScript checks.
Production HTTP smoke tests passed for the homepage, admin article and affiliate
routes, sitemap, and cron endpoint authorization. The owner has configured
hosted Supabase separately; its environment files are not read by this workflow.
The owner reports applying the review-first migration to that project; this
workflow has not independently inspected the hosted database.

## Guided review format and photo workflow

- Reviews now have guided quick-verdict, public visit date/budget/best-for,
  experience, what-we-tried, practical tips, and return-verdict fields.
- The Photos tab reuses the authenticated upload flow without leaving the
  review. Editors can select covers, add existing photos, reorder galleries,
  and set review-specific alt text, captions, and credits (up to 50 photos).
- Public reviews and private previews share a fixed layout, hide empty optional
  sections, and provide keyboard-dismissible photo enlargement. Legacy bodies
  are preserved; their public layout changes only after saving in the editor.
- Templates use versioned metadata in the existing content JSON, so no additional
  database migration is required. Review duplication retains the template and
  the SEO audit counts the guided sections.
- Dashboard data now renders inside a page-level Suspense boundary. Removed the
  fake workspace dropdown and replaced the account arrow with explicit Sign out.
- Production build and public/model/browser checks are run in a disposable app
  with no personal environment files or hosted database access. Full authenticated
  upload/save/publication tests are extended but remain unverified while the
  previously reported local Docker storage failure blocks that backend.

## Review-first migration

- Added `20261102000003_review_first.sql`: preserves all existing records and
  IDs, generalizes stored restaurant records to restaurant/activity places,
  adds review type and an optional 0–10 editorial score, and saves each review
  atomically with SEO, media, and place context.
- New review URLs are `/restaurants/[slug]` and `/activities/[slug]`. Old
  section and article URLs redirect permanently. Metadata, cards, structured
  data, sitemap, and public navigation use the new URLs.
- Public review feeds have search and latest/highest-score sorting. No scores
  are inferred for existing content; scores are editorial opinions rather
  than customer-average ratings.
- Admin uses Reviews, Places, and Visits. Old admin URLs redirect. Reviews link
  to place details, visit creation, existing visits/receipts, and previews;
  starting from a place or review preselects the related records.
- Backend table names stay unchanged to avoid disrupting existing media,
  receipts, roles, and references. Existing CMS records are preserved.
- Apply only the new migration once to an already-migrated project; do not
  rerun the original table-creation migrations. Review classifications after
  migration, especially former Save/Stories content. See README for details.
- Full local Supabase E2E validation is currently blocked by Docker's image
  store returning input/output errors before PostgreSQL starts. No Docker reset,
  hosted database migration, or personal environment-file access was performed.

## What is in place

### Public publication

- Review-first homepage, Restaurants and Activities feeds, About Us, editorial
  pages, and review routes; old category URLs redirect.
- Responsive public header/footer, shared article/category components, metadata,
  structured data, robots, sitemap, and site icon.
- Reviews are loaded only from Supabase when published and their publication
  time has arrived. There is no local demonstration-article fallback.
- Published CMS article content is rendered as validated React nodes rather
  than injected HTML. CMS-backed pages are split into explicit section routes.
- Public and admin route groups have separate layouts, so admin pages do not
  inherit public navigation or footer.

### Editorial CMS

- Invite-only login and protected admin workspace at `/admin`.
- Article list and editor with validated rich text, metadata, categories,
  featured and social-sharing image selection, restaurant/neighborhood context,
  sponsorship disclosures, autosave/conflict handling, and role-aware
  review/publishing controls.
- Restaurant and restaurant-visit management, private receipt uploads, public
  editorial media, neighborhood editing, team access, affiliate-link
  management, SEO audits, analytics connection status, and settings views.
- Private authenticated article previews, article and restaurant filters,
  dashboard activity/reminders, and confirmation before deleting media.
- Optional public receipt details require an explicit per-visit opt-in and a
  published article. The public view excludes private notes and receipt paths.
- Supabase role checks for owner, editor, and contributor; team invitations and
  role changes require the server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Browser-to-Supabase Storage uploads for editorial media and receipts.
- SQL migrations define the CMS schema, row-level security/storage policies,
  publishing actions, and restricted public content functions:
  - `supabase/migrations/20261030000000_editorial_cms.sql`
  - `supabase/migrations/20261030000001_publishing_actions.sql`
  - `supabase/migrations/20261030000002_public_receipt_details.sql`
  - `supabase/migrations/20261102000003_review_first.sql`

### Documentation and setup

- `.env.example` and `README.md` describe Supabase configuration, owner
  bootstrap, storage/privacy constraints, deployment, and launch content needs.
- Scheduled articles have an hourly Vercel Cron endpoint and database RPC.
  Automatic publishing is not active until the latest migration and server-only
  Vercel secrets are configured and a Cron run is observed.
- Analytics and SEO screens are status/audit views, not connected analytics or
  external crawler integrations.
- Optional public receipt images must already be redacted before upload.

## Verification completed

Most recently verified locally:

- Isolated production build — passed with Next.js 16.4.3 and Cache Components
  enabled, via `npm run test:e2e:public` without personal environment files.
- `npm run test:e2e:public` — 65 tests passed: desktop/mobile public pages,
  legacy section redirects and canonical URLs, discovery files, removed demo
  URLs returning not found, empty feeds without sample cards,
  SEO titles/descriptions/canonicals, PNG share-image dimensions, About copy
  and structured data,
  login styles, signed-out access, score boundaries, review/place types,
  template validation/content preservation, fixed section order, optional-section
  hiding, gallery enlargement/keyboard dismissal, and editor section/photo state
  across tab changes. Editor browser fixtures leave required fields blank so
  they cannot write to a backend; they do not prove authenticated persistence.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `git diff --check` — passed.
- Full CMS E2E run — blocked before database startup by a Docker image-store
  input/output error. The new SQL migration, live authenticated CRUD,
  publishing, uploads, team, and role tests are not verified by this run.

The smoke-test production server was stopped after verification.

The protected admin layout waits for `connection()` and verifies the session
before rendering the workspace. Its `instant = false` configuration explicitly
allows this authentication-dependent layout to block navigation. This replaces
the earlier sibling Suspense dynamic marker, which did not protect other
rendering branches. Public routes retain Cache Components and instant-navigation
validation.

## Current limitations and risks

1. **Latest migration not live-validated.** Full local Supabase tests cannot
   start because of the Docker image-store error. The latest review-first
   migration and authenticated CMS workflows still need database validation.
2. **No production deployment verification.** Vercel environment variables,
   Supabase Auth redirect URLs, domain/DNS, and deployed URLs still need
   configuration and testing.
3. **First real reviews need publishing.** Demo articles have been removed.
   Add firsthand reporting, named authors, accurate dates, and owned/licensed
   imagery through the CMS before launch.
4. **Operations need real integrations.** Scheduled publishing needs configured
   secrets and a monitored Vercel Cron run. Newsletter, analytics reporting,
   and affiliate tracking are not connected.
5. **Some media workflows remain basic.** Upload is one file at a time; full
   drag-and-drop/batch upload and richer media associations/search are not
   implemented. The SEO audit is an internal check, not an external crawler,
   and analytics cards remain connection-status indicators rather than reports.
6. **Sensitive receipt handling needs operational care.** Private receipts and
   visit notes must remain restricted; public receipt copies must be redacted
   before upload.
7. **Worktree is uncommitted.** No commit was created. Review and preserve all
   existing and newly modified files.

## Way forward

### 1. Configure and validate Supabase

- Create/select a Supabase project and populate `.env.local` from `.env.example`
  with the project URL and publishable key.
- Review all migrations, especially RLS policies and storage bucket access,
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
- Apply and validate the latest public receipt, article context, affiliate, and
  scheduled-publishing RPC migration.

### 3. Finish product and launch readiness

- Replace concept content and development artwork with reviewed editorial
  material and owned/licensed images.
- Complete the correction/contact workflow and review privacy, affiliate, and
  editorial disclosures against the services actually enabled.
- Perform keyboard, screen-reader, mobile, and responsive checks on public and
  admin flows.
- Set `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel, then verify an
  hourly scheduled publication and cache invalidation.
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
