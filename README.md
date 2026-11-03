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
- Owners/editors can search matching places or use **Create and link place**
  inside the review editor without leaving their writing. Enter the name and
  location, check the generated URL slug (editable for another branch), then
  create; the new place is selected automatically. Creation saves the place
  separately; wait for **All changes saved** to persist the review's link.
  Drafts may be unlinked; publishing/scheduling requires a matching place.
  Contributors still cannot create or change place records.
  Reviews can also start from a place record. After saving a review, **Record this visit**
  preselects the review and linked place. Existing visits are linked from the
  review editor. Costs for activity tickets use the tickets/additional-charges
  field. Visit details and receipts stay private unless explicitly opted in.
- Reviews can be searched and sorted by date or highest editorial score.
  Scores are the publication's opinions, not customer averages; no aggregate
  rating schema or invented scores are generated.
- The story, images, context, SEO, and score save in one database transaction.

### Guided review format and photos

Neighborhood slugs accept names such as `Spring Valley` and normalize spaces,
underscores, accents, and capitals to URL-safe text such as `spring-valley`
when saved. Other unsupported punctuation produces an actionable validation
message; duplicate names/slugs are still rejected.

Every existing and new restaurant/activity review uses one shared public layout:
title and optional score → short quick verdict → byline → cover photo → one
at-a-glance panel → section links → Our experience → What we tried → Before
you go → Would we go back? → additional photos → optional receipts/disclosures
→ related published reviews and category navigation. Private previews use the
same layout without public recommendations. The permanent rules are in
[`AGENTS.md`](./AGENTS.md), and desktop/mobile regression tests protect the order.

The quick verdict appears above the cover and shows up to two sentences, at
most 280 characters. Longer saved verdicts remain available through **Read the
full takeaway**. Write a concise headline (use the SEO title for search wording)
and start the return verdict with yes/no and why. Section headings are automatic;
start each section with the answer rather than repeating its heading.

The single practical-details panel combines the exact linked branch/address,
public price/budget, best-for, neighborhood, and visit date. Directions and
official-site links appear when their saved place fields are available. Missing
facts stay hidden; private visit records are never used to fill them. The cover
is excluded from additional photos without removing its saved gallery selection.
Redundant leading section labels are hidden only when they match known labels;
the stored rich text is preserved. Related links use up to three other indexable
published reviews in the same category, with a category link when no others exist.
The score remains optional. Empty optional sections are hidden; the narrative
sections support rich text, inline library images, links, lists, and video.
The editor groups the basics, experience/practical narrative, verdict/score,
and photography, with SEO and publishing in separate tabs. Formatting buttons
wrap with full-width labels and 44px minimum height on mobile and desktop.

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
Wait for **All changes saved** before leaving. Validation failures explicitly
show **Not saved** with the field to correct; clicking an internal navigation
link with unsaved edits asks for confirmation. Browser reload/close uses the
browser's unsaved-changes warning. These warnings do not recover work already
discarded and are not a guarantee against browser crashes or back-button
navigation. Saved drafts appear in **Admin → Reviews**, not the public feeds.

Existing reviews inherit the shared layout immediately, including reviews that
predate the guided editor. Their original body appears under **Our experience**,
without automatic rewriting or invented verdicts. The versioned template is stored
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
match the old site routes. The migration leaves stored custom canonical values
untouched; the current public renderer uses automatic review URLs instead.

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

### Admin inactivity timeout

Apply [`20261102000004_admin_idle_sessions.sql`](./supabase/migrations/20261102000004_admin_idle_sessions.sql)
after the review-first migration, **before deploying the timeout code**. Existing
sessions must sign in again: only freshly authenticated Supabase sessions can
initialize a new inactivity lease. This migration adds a private lease table
linked to Supabase Auth sessions, a server-time expiry RPC, and restrictive
authenticated RLS policies on CMS tables and editorial/private receipt storage.
Anonymous public reads and service-role operations retain their existing policy
behavior; public editorial image URLs remain public.

The admin signs out after 30 minutes without recorded activity and warns during
the final 2 minutes. Typing, pointer interaction, and scrolling renew the lease,
at most once a minute; passive autosaves, prefetches, token refreshes, and open
tabs do not. **Stay signed in** explicitly renews it. Tabs share the server
deadline; before expiry a tab checks for activity recorded by another tab.
Expired leases cannot be revived by the heartbeat; sign in again instead.
This is an inactivity limit, not an absolute maximum session duration or MFA.
Auth-token refresh alone cannot bypass the CMS lease checks.

### Publication place requirement and save troubleshooting

Apply [`20261102000005_review_publication_place.sql`](./supabase/migrations/20261102000005_review_publication_place.sql)
after migration 04 and before deploying this editor update. It adds a database
trigger, not new permissions: owners/editors retain their roles and contributors
still cannot manage places. Application checks provide actionable feedback,
and the database also rejects direct writes or scheduled publication without a
matching place. Unlinked drafts remain valid.

Existing published records are not rewritten; unrelated edits remain possible.
Link a place before republishing an old unlinked review. Return a published or
scheduled review to draft before changing its type and linked place together.
Before enabling scheduled publishing, find and repair any older unlinked or
mismatched scheduled records (or return them to draft):

```sql
select a.id, a.title, a.status
from public.articles a
left join public.restaurants p on p.id = a.restaurant_id
where a.status = 'scheduled'
  and (p.id is null or p.place_type <> a.review_type);
```

An invalid due record fails the cron transaction explicitly; monitor failures
and repair it rather than assuming other due reviews published successfully.

Review saves no longer label every database permission denial as a role issue.
They distinguish expired leases, stale sign-in permission claims, and database
permission errors. After a role change, sign out and sign in again; verify that
the Auth role and editorial profile agree and all migrations are installed.
For `Database permission check failed for owner: CMS access is required`, apply
[`20261102000006_cms_role_checks.sql`](./supabase/migrations/20261102000006_cms_role_checks.sql)
after migration 05 in the Supabase SQL Editor or through your migration runner.
Three publishing functions used a variable named `current_role`, which PostgreSQL
resolves as its built-in database role (`authenticated`) instead of the signed
CMS role. Migration 06 replaces those functions with an unambiguous variable;
it preserves their grants, RLS, inactivity limits, and contributor restrictions.
Do not rerun the original schema migrations or disable RLS. Retry saving after
applying migration 06; signing in again alone cannot fix this SQL name collision.

The review editor includes Content, Photos, SEO, and Publishing tabs. The SEO
preview follows the restaurant/activity URL, falls back to the headline/site
name and subtitle, and shows the selected social sharing image. Canonical URLs
are fully automatic: every review uses its current `/restaurants/slug` or
`/activities/slug` URL in metadata, social sharing, article structured data, and
the editor preview. There is no canonical input. Old saved overrides are ignored
and cleared on the next review save. Changing the review type or slug updates
the generated URL automatically; no database migration is needed.
Keywords and internal linking notes are private
editorial planning fields; add actual links in the review text. SEO audit links
open the relevant editor tab, Media library, or author settings. Saving or
changing status reveals the tab containing an invalid field. Set your public
byline in **Settings → Your author profile**; this updates your reviews and
preserves the chosen name when your role is synchronized. Signing out affects
only the current session.

Apply [`20261102000007_review_indexing.sql`](./supabase/migrations/20261102000007_review_indexing.sql)
after migration 06. It keeps the indexing checkbox effective when a published
review is saved, without requiring another publication transition. Turning it
off applies noindex and removes the review from public listings and the sitemap;
the published direct URL stays public. It does not publish drafts. Saving a
published review updates it live. Archived reviews can return to draft, and a
scheduled review must be returned to draft before archiving. Scheduling controls
are available only when the publishing endpoint credentials are configured;
automatic runs still require the deployed hourly cron.
The Publishing tab also exposes the indexing checkbox, using the same saved
setting as SEO. It makes a published page eligible for indexing; it does not
submit it to Google or guarantee search inclusion. Existing schedules reopen
with the saved Las Vegas date and time. Click Schedule to apply a date change;
Save changes saves review content and indexing, not the scheduling date.
Times skipped by the daylight saving clock change are rejected. Automatic
publication can occur up to an hour after the selected time with the hourly job.

At timeout, unsaved review form contents are kept in same-tab `sessionStorage`,
scoped to the signed-in user and review (or new draft). After signing in as the
same user, reopen that review or New review and choose **Restore unsaved review**.
Recovery does not silently overwrite the database. Discard explicitly or save
successfully to clear the recovery copy. Tab closure/storage clearing can lose
the copy; it is not a backup, encrypted vault, or a mechanism for locking down
an unattended browser. This recovery applies to the review editor, not every
admin form. If preservation fails, automatic redirection stops with an explicit
error so writing can be copied; server authorization remains expired.

Warning/sign-out/API failures are shown explicitly. If a browser sleeps, timers
may run late, but server deadlines still apply on the next protected operation.
The custom SQL enforcement needs live validation; local database E2E is currently
blocked by Docker storage I/O errors. Do not treat passing public browser tests
as evidence that the migration was applied to hosted Supabase.

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
   The checked-in hourly expression requires a hosting plan that supports it.
   [Vercel Hobby only supports daily cron schedules](https://vercel.com/docs/cron-jobs/usage-and-pricing);
   it cannot run this hourly configuration. Check the deployed plan and Cron
   executions before relying on automatic publication. The presence of server
   credentials alone does not verify that the job is running.

Media uploads go directly from the signed-in browser to Supabase Storage.
Next.js image optimization allows only the configured `NEXT_PUBLIC_SUPABASE_URL`
origin's public `editorial-media` bucket. This lets review cards load CMS photos
without allowing unrelated projects, private buckets, or signed URLs. Keep that
public origin set during the production build and redeploy after changing it.
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

The SEO audit checks configured article titles, descriptions, and
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
  are currently indexable. Removed demo URLs return not found; empty category
  sections and the unfinished Contact page are not indexable.
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
Privacy page. The homepage and public reviews use the manual AdSense units below.
Affiliate tracking and separate visitor analytics/reporting are not configured.
Sponsored labels and affiliate disclosures remain separate from display ads.

### Ads, analytics, and SEO measurement roadmap

The owner supplied AdSense publisher `ca-pub-8863066373093222` and In-article
unit `5213709246`. The shared review template inserts one labeled unit after
**Our experience** on public, indexable reviews with at least two nonempty
experience paragraphs and 100 words. This is an editorial threshold, not a
Google requirement. Private previews, short/empty reviews, and informational
pages load no ad unit or ad library. Existing reviews inherit the placement
without editing their saved content.

The homepage uses responsive Display unit `8538710734`, with `data-ad-format`
set to `auto` and full-width responsiveness enabled. It appears once after the
latest review cards and before the restaurant/activity introduction, only when
there is at least one published indexable review. An empty publication has no
homepage slot or ad loading.

`AdSenseUnit` provides both placements, loads the AdSense library asynchronously
through `next/script` with one shared library ID, and initializes each
mounted unit once after the library is ready and its width is usable. The
library is shared across client navigation; the unit is keyed by review ID.
Next.js keeps previously visited pages in Activity: a filled unit is preserved
when returning to a cached homepage or review, without another request. Pending units on
hidden pages are excluded from initialization if navigation beats script loading.
There is no timer refresh or custom ad creative. The wrapper reserves responsive
space, expands with fluid content, collapses for Google's `unfilled` status, and
is removed if the library is blocked or fails to load.

The account verification meta tag remains in the public route layout only.
Google Privacy & messaging is the chosen CMP: publish the applicable messages
and privacy settings in AdSense. The AdSense tag also delivers account-published
messages, as described in [Google's Privacy & messaging documentation](https://support.google.com/adsense/answer/10924669).
No homemade consent flag or forced consent grant is used. The account's approval,
message publication, regional choices, and authorized `ads.txt` record cannot be
verified from the repository and are not established by merely supplying ad code.
The Privacy page now describes Google advertising and links to Google's data-use
and ad-choice information.

Browser contexts block real advertising by default; explicit test mocks override
that block for integration checks.

No separate analytics tag or reporting connector has been installed. The admin
Analytics screen checks configuration presence only; detecting credentials is
not proof of data collection or reports. Browser tests replace the ad library
with a local mock, including filled, unfilled, blocked, and route-change cases;
they never request or click live ads and do not certify actual consent behavior.

#### Recommended measurement stack

| Tool | Purpose | Initial setup and acceptance check |
| --- | --- | --- |
| Google Search Console | Google impressions, clicks, CTR, search queries, indexing, and reported search position | Verify the domain through DNS; submit `https://vegasunfiltered.com/sitemap.xml`; inspect a published review's canonical, crawl/index status, and rendered page. Verification is separate from GA4 and needs no visitor analytics tag. |
| Google Analytics 4 (GA4) | Visits, acquisition sources, engagement, and useful outbound actions | Create a production property/web stream; implement consent-aware public-site collection; verify events in DebugView/Realtime and confirm reporting after processing. |
| PageSpeed Insights and Search Console Core Web Vitals | Loading speed, responsiveness, and layout stability | Test real mobile review pages, including photos and later ads. Use lab results initially; field data may be unavailable until there is sufficient real traffic. |
| Selected ad network's reporting | Ad impressions, revenue, page RPM, and viewability where available | Choose a provider, complete its review/setup, and verify actual delivery and revenue in its dashboard. Keep ad estimates separate from confirmed earnings. |

Use Search Console for organic search visibility and GA4 for on-site behavior;
neither replaces the other. GA4 is not required for Google indexing or ranking.
Do not add multiple overlapping analytics products or Google Tag Manager unless
there is an actual tag-management need. The existing admin reporting credential
names are placeholders for a future server-side reporting connector, not
instructions for installing the public GA4 tag.

#### Phase 1: baseline before ads

1. Deploy real, indexable reviews with accurate authorship, original photos,
   visit context, prices, and useful internal links. Confirm HTTPS/canonical
   redirects and public/private boundaries on the production domain.
2. Verify Search Console and inspect published URLs. Record indexing problems
   and fixes; sitemap submission is not a guarantee of indexing or ranking.
3. Optimize large photo delivery and establish a mobile performance baseline.
   Target field p75 LCP <= 2.5 seconds, INP <= 200 ms, and CLS <= 0.1. Lab tests
   are diagnostics, not substitutes for these field measurements.
4. Define privacy/consent behavior before loading GA4 or advertising scripts.
   Review applicable law, visitor regions, and current provider requirements;
   choose a consent-management platform if needed. Nonessential collection
   should remain off until the applicable consent permits it. Provide consent
   withdrawal/settings and implement required opt-outs. Consent Mode alone is
   not a consent banner or a compliance solution.
5. Update the public privacy policy to identify active providers, data/purposes,
   cookies or storage, retention, choices, and a working privacy contact.
   Do not claim tracking is absent once it is enabled.

#### Phase 2: GA4 collection and editorial reporting

- Load the public measurement tag only on eligible public production pages,
  not admin, login, private previews, local development, or disposable E2E apps.
  Configure internal-traffic exclusions and test consent granted, denied,
  withdrawn, and blocked-script scenarios.
- Track one `page_view` per actual navigation, including Next.js client-side
  navigation. Choose automatic or manual page-view tracking deliberately to
  avoid duplicate events.
- Add `review_read` once per review/page view when the visitor reaches the
  final-verdict section; it measures reaching a section, not verified reading.
  Add `outbound_click` with controlled `link_type` values such as
  `place_website` and `affiliate`. Use reviewed, low-cardinality parameters and
  register custom dimensions only where reporting needs them.
- Track newsletter subscriptions only after a real signup succeeds. Do not
  invent conversions or treat arbitrary scrolling as a business outcome.
  Reconcile affiliate clicks with the partner's actual conversion reporting.
- Never send emails, private visit/receipt data, unpublished content, Auth IDs,
  raw form values, or sensitive query parameters to analytics. Sanitize page
  URLs before collection, including page-view and outbound-link payloads.
- Use consistent campaign UTMs for social links, without personal data, to
  distinguish social traffic from organic search and referrals.
- Start with provider dashboards. Add read-only GA4/Search Console API reports
  to the admin only when useful; keep API credentials server-only and show
  date ranges, data freshness, and real permission/API errors. Never display
  fabricated zero metrics or mark reporting connected merely from env presence.

#### Phase 3: advertising

- Google AdSense and the owner-supplied homepage and In-article units are implemented above.
  Account approval and live delivery still require verification in AdSense;
  do not promise acceptance, minimum traffic, or income.
- Finish original content, public contact/privacy/disclosure pages, consent
  handling, and provider verification before enabling delivery. Publish
  `/ads.txt` only with the selected provider's exact authorized seller records;
  never invent publisher IDs or add placeholder authorization lines.
- The shared `AdSlot` now renders the supplied manual unit with explicit labels
  and reserved responsive space. Keep placement conservative
  after substantive review content or below the article, not over the cover,
  verdict, navigation, or controls. Keep ads out of admin/private pages and
  empty/error pages. Do not insert slots into saved rich-text review content.
- Preserve the review layout and avoid accidental-click placement, intrusive
  overlays, and ad-driven layout shifts. Load third-party code through a
  consent-aware integration and keep reviews usable when scripts are blocked
  or an ad has no fill. Never click live ads to test them.
- Re-test performance, keyboard/mobile accessibility, consent, route changes,
  and empty placements with advertising enabled. Compare revenue against
  engagement and performance, not revenue alone.
- Display ads, paid editorial sponsorships, and affiliate links are separate
  revenue sources. Keep each labeled and report each separately; none buys a
  favorable review or score.

#### Operating scorecard

Review weekly: published/indexed reviews, Search Console clicks/impressions/
CTR and query/page trends, organic landing-page visits, engaged sessions,
final-verdict reach, outbound actions, and mobile performance. Search position
is a contextual average, not a universal rank. Traffic and revenue may be zero
or unavailable early on; do not invent targets or interpret missing data as zero.

Review monthly once ads run: confirmed revenue, page RPM with its provider's
definition, viewability/fill where available, and changes in speed/engagement.
Compare matching date ranges and note consent/ad-blocking gaps, processing
delays, and different attribution rules. GA4, Search Console, and ad-network
totals will not necessarily match. Maintain a change log for deployments,
tracking changes, and ad placements so changes can be interpreted honestly.

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
