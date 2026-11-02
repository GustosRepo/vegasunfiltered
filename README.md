# Vegas Unfiltered

A firsthand Las Vegas restaurant and activity review site built with Next.js 16
App Router, React Server Components, TypeScript, and Tailwind CSS 4. The project is deployable on Vercel
and uses `https://vegasunfiltered.com` as its canonical domain.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production verification:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Editorial CMS

### Review-first workflow

- Public navigation is **Restaurants**, **Activities**, and **About Us**.
  Stories, food, drinks, cost, atmosphere, and verdict are parts of one review.
- Reviews live at `/restaurants/[slug]` or `/activities/[slug]`. Old `/eat`,
  `/drink`, `/explore`, `/save`, and `/stories` links permanently redirect;
  published CMS links resolve the saved review type rather than guessing from
  their former category.
- The CMS uses **Reviews**, **Places**, and **Visits**. Place facts are reusable
  supporting records, not separate public listing pages. Existing database
  table names (`articles`, `restaurants`, `restaurant_visits`) are retained.
- Start at `/admin/reviews/new`, choose Restaurant or Activity, write the
  experience, and optionally enter an overall editorial score from 0 to 10
  (one decimal place). Blank means unscored; no score is inferred from old content.
- Editors can link a matching place, add one through **Add a place**, or start a
  review from its place record. After saving a review, **Record this visit**
  preselects the review and linked place. Existing visits are linked from the
  review editor. Costs for activity tickets use the tickets/additional-charges
  field. Visit details and receipts stay private unless explicitly opted in.
- Reviews can be searched and sorted by date or highest editorial score.
  Scores are the publication's opinions, not customer averages; no aggregate
  rating schema or invented scores are generated.
- The story, images, context, SEO, and score save in one database transaction.

### Guided review format and photos

The review editor uses one shared format for restaurants and activities:
cover/title/disclosure, quick verdict, at-a-glance facts, our experience,
what we tried, worth knowing, would we go back, and a photo gallery.
The score remains optional. Empty optional sections are hidden; the narrative
sections support rich text, inline library images, links, lists, and video.

Open a review's **Photos** tab to upload without leaving the editor, choose a
cover, or add existing media to its gallery. Reorder gallery photos with
**Move up / Move down**, and edit each photo's alt text, caption, and credit.
Readers can enlarge gallery photos and dismiss them with Escape or the close
button. Galleries allow up to 50 photos and require alt text.

Uploads also appear in **Media library**. Removing a gallery selection does not
delete the original file. Gallery captions, descriptions, and credits are saved
with that review; later edits to shared library metadata do not overwrite them.
Cover/social images continue to use shared library metadata. Save the review
before opening its private preview or navigating to another admin record.

Existing reviews keep their original body and public rendering until saved
through the guided editor; the original body then appears under **Our
experience**, without automatic rewriting. The versioned template is stored
inside the existing content JSON and saved by the existing atomic review RPC.
No additional migration is needed for this format, assuming the review-first
migration below is already installed. Duplication and private previews preserve
the template. The SEO audit includes all guided narrative sections.

All editorial image uploads are public, including images for unpublished drafts.
Do not upload private receipts or personal information here. The optional
**Visit date** and budget/best-for fields in the review are public editorial
facts, separate from private visit records and their explicit sharing opt-in.

**Existing installation:** back up your project, then apply
[`20261102000003_review_first.sql`](./supabase/migrations/20261102000003_review_first.sql)
once after the three earlier migrations. Do not rerun the original table-creation
migrations. The new migration preserves IDs, content, visits, media, and roles;
adds optional scoring and place/review types; and updates canonical URLs that
match the old site routes. Custom canonical URLs are left untouched.

Existing linked-place reviews stay restaurant reviews. Otherwise, experience
reviews and old Explore/Save/Stories articles move to Activities; other articles
default to Restaurants. Review this classification and edit as appropriate
before launch. Legacy guide/story drafts are preserved, not reclassified as
verified firsthand reporting. The application requires this migration before
configured Supabase reads or review saves can work. No script applies it to
your hosted project automatically.

All public reviews come from the CMS. Hardcoded demonstration articles and
fallback cards have been removed; empty feeds show an honest no-reviews state.
Former demo URLs return not found unless a real published CMS review uses that
slug. Production reviews are stored in Supabase and loaded only when their status is `published` and their
publication time has arrived. Drafts remain private to authenticated editors;
published stories marked noindex can render but are excluded from category
feeds and the sitemap.

The invite-only workspace is at `/admin`. It includes article editing and
publishing, featured and social-sharing image selection, restaurant records,
private visit and receipt tracking, public editorial media, neighborhoods,
affiliate-link disclosures, an article metadata audit, team access, and
integration status. Scheduled articles are published by the included Vercel
Cron endpoint once per hour when `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and
the Vercel Cron configuration are deployed. Monitor Cron executions and missed
publications; scheduled status is not automatic if the endpoint or credentials
are unavailable.

The protected admin layout is request-rendered and uses `instant = false`:
session verification and redirects must finish before the workspace is shown.
This exception is scoped to the protected CMS, not the public publication.

### Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`. Set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from
   the project API settings. The legacy anon-key variable is accepted as a
   fallback.
2. Apply the SQL files in `supabase/migrations/` in filename order using the
   Supabase CLI or SQL editor. Review the RLS and storage policies for your
   deployment before applying them.
3. Create an owner account through Supabase Auth using the dashboard or a
   trusted provisioning flow. Set `auth.users.raw_app_meta_data.cms_role` to
   `owner` for that account. The profile trigger mirrors this signed app
   metadata into `public.profiles`; users cannot grant themselves roles.
4. Configure the Supabase Auth site URL and redirect allowlist for the
   deployed site. The CMS login is `/admin/login`; there is no public signup.
5. To invite team members or change their roles in the dashboard, set
   `SUPABASE_SERVICE_ROLE_KEY` only in server-side local/deployment secrets.
   Never expose it to browser code or commit it. The team UI supports inviting
   editors/contributors and changing those roles; owner-role changes remain a
   manual bootstrap operation.
6. Deploy with the two public Supabase variables set in Vercel. Applying
   migrations and provisioning the first owner remain explicit operator tasks.
7. For scheduled publishing, configure `CRON_SECRET` and
   `SUPABASE_SERVICE_ROLE_KEY` as server-only Vercel environment variables.
   `vercel.json` runs `/api/cron/publish-scheduled` hourly. Run the new
   `20261030000002_public_receipt_details.sql` migration as well as the earlier
   migrations; it also adds the featured-media action, public author and
   affiliate-link reads, and the due-article publishing RPC. Verify a scheduled
   article publishes after its time in the deployed environment.

Media uploads go directly from the signed-in browser to Supabase Storage.
Editorial images are public; receipts use the private `private-receipts` bucket.
An optional public receipt must be redacted before upload—the CMS does not
redact or verify personal information in that image. Never place card details,
customer names, or other sensitive information in public images or visit notes.
Owner/editor RLS controls restaurant visits and private receipts.
Visit totals, items, return recommendation, and verdict remain private unless
an editor explicitly enables public receipt details for the associated visit.
The public page reads only those approved fields for an already-published
article; internal notes and private receipt paths are never returned by that
public details function.

## End-to-end tests

```bash
npx playwright install chromium
npm run test:e2e:public  # No Docker: desktop/mobile public pages and signed-out UI
npm run test:e2e         # Docker Desktop: real isolated Supabase and CMS flows
npm run test:e2e:ui      # Same isolated stack with Playwright's interactive runner
```

The runner builds a disposable source copy without reading project environment
files and does not inherit application credentials from your shell. Full tests
start a dedicated `vegasunfiltered-e2e` Supabase stack on ports 55420–55424 and
the application on port 3100. They create disposable users/records, test
publication, privacy, permissions, uploads, team management, and scheduling,
and stop the stack without a backup afterward. Never substitute your production
database. Reports and traces are ignored by Git because they can include test
credentials and browser sessions.

The full suite needs a working Docker image store and sufficient disk space.
An image-download or Docker input/output error is an infrastructure failure,
not a completed test run. Public-only tests can run without Docker; production
builds still need access to the Google Fonts used by the app.

### First-owner access troubleshooting

A Supabase Auth account alone does not grant CMS access. The account needs a
`cms_role` in app metadata and a matching editorial profile. The login form
reports missing roles, missing profiles, or mismatched roles rather than
redirecting an authenticated but unauthorized user back and forth.

After creating your first user, run this in your project's Supabase SQL Editor,
replacing the placeholder with that user's email:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"cms_role":"owner"}'::jsonb
where email = 'YOUR_EMAIL_HERE'
returning id, email, raw_app_meta_data ->> 'cms_role' as cms_role;
```

Confirm exactly one row is returned. The migration's Auth trigger synchronizes
the editorial profile. Then sign in again to refresh the session's role claim.
Do not grant roles through user-editable metadata or put account credentials
in environment files.

The SEO audit checks configured article titles, descriptions, canonicals, and
indexing flags; it is not an external crawler. Analytics cards are connection
status only, not reports. No analytics connector or tracking script is enabled.

To create the first real review, open **Admin → Reviews → New review**, enter
your own visit details, upload owned/licensed photos in **Photos**, save, and
check **Private preview**. Use **Publishing** to submit, approve, and publish
when ready. Drafts never appear in public feeds.

Record private costs and receipts in **Visits** and link them to the review.
Only explicitly shared visit details or redacted public receipts are rendered.
SEO, social image selection, place context, sponsorship labels, and affiliate
links are managed in the CMS rather than hardcoded article objects.

## Project structure

- `src/app/` — homepage, category pages, editorial pages, article routes, sitemap,
  robots, and site icon.
- `src/components/` — shared header/footer, story cards, article/category
  templates, image placeholders, and structured data.
- `src/lib/content.ts` — review summary types, section configuration, and legacy route mapping.
- `src/lib/site.ts` — site name, canonical origin, description, and navigation.
- `public/art/` — original vector development artwork, not documentary photos.

## SEO and content safeguards

The About page reflects the owner's dad-and-husband perspective and focus on
honest reviews and value, without invented names, residency, credentials, or
social profiles. It includes AboutPage/breadcrumb structured data and links to
review sections and disclosure policies. Add personal names and verified social
profiles only when the owner chooses to make them public.

Page titles/descriptions identify Las Vegas restaurant and activity coverage.
Canonical URLs use the production domain. The default social image is generated
as a 1200×630 PNG at `/opengraph-image`, not SVG development artwork. CMS review
social images override the brand fallback when configured. Empty review sections
remain noindex and out of the sitemap until indexable reviews are published.
These are technical foundations, not a ranking guarantee; Search Console setup
and live URL inspection still require deployment and domain ownership.

- Canonicals and Open Graph/Twitter metadata are set per route, with the
  canonical origin fixed to `https://vegasunfiltered.com`.
- The homepage, About, Editorial Policy, Privacy, and Affiliate Disclosure pages
  are currently indexable. Demo story pages, empty category sections, and the
  unfinished Contact page are not.
- `src/app/sitemap.ts` includes only indexable static pages and published
  editorial content. `src/app/robots.ts` advertises the sitemap.
- Organization and WebSite JSON-LD use stable IDs. BlogPosting JSON-LD is
  emitted only for published stories with real author and publication metadata;
  breadcrumb data is emitted on article pages. Restaurant and original
  VideoObject entities are emitted only when their required, verified details
  are supplied.
- No review ratings, fabricated business facts, or unsupported social profiles
  are added to structured data.
- Local SVG artwork is labeled as development artwork. Replace it with
  commissioned, owned, or properly licensed assets before public launch.
- Content is rendered on the server by default. The mobile navigation uses
  native `<details>` and does not require client-side JavaScript.

## Integrations and environment

The public site can still run without Supabase; CMS-backed articles and admin
data require the public Supabase URL and publishable key described above. The
newsletter remains an inactive status panel. Before enabling signup, configure
an email provider, server-side validation and consent handling, and update the
Privacy page. Advertising, affiliate tracking, and analytics reporting are not
configured. Sponsored labels, affiliate disclosure, and an opt-in ad slot
component are available without loading tracking scripts.

## Deploy to Vercel

1. Import the repository into Vercel and use the detected Next.js build settings.
2. Add `vegasunfiltered.com` in the Vercel project Domains settings and complete
   the DNS instructions Vercel provides.
3. Verify that HTTPS is active and that the production canonical domain resolves.
4. Run the production checks above and inspect `/robots.txt` and `/sitemap.xml`.

## Before public launch

- Publish complete, fact-checked reviews through the CMS; add named
  authors, accurate publication dates, relevant internal links, and image
  captions where applicable.
- Replace development illustrations with owned or licensed editorial imagery
  and retain useful alt text.
- Set up a monitored editorial contact address and a correction workflow.
- Review the privacy notice and legal disclosures against the production
  services actually enabled.
- Connect an email provider only after configuring consent, data handling, and
  the required privacy updates.
- Run a real-device accessibility and responsive review; validate representative
  metadata, JSON-LD, sitemap, and production URLs after deployment.
