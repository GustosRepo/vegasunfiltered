# Vegas Unfiltered

An editorial Las Vegas publication built with Next.js 16 App Router, React Server
Components, TypeScript, and Tailwind CSS 4. The project is deployable on Vercel
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

The public site retains its typed demonstration stories in
[`src/lib/content.ts`](./src/lib/content.ts). Production CMS stories are stored
in Supabase and are loaded only when their status is `published` and their
publication time has arrived. Drafts remain private to authenticated editors;
published stories marked noindex can render but are excluded from category
feeds and the sitemap.

The invite-only workspace is at `/admin`. It includes article editing and
publishing, restaurant records, private visit and receipt tracking, public
editorial media, neighborhoods, an article metadata audit, team access, and
integration status. Scheduled articles are saved with a future timestamp, but
publishing is not automatic: configure and monitor an external scheduler before
using scheduled status in production.

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

Media uploads go directly from the signed-in browser to Supabase Storage.
Editorial images are public; receipts use the private `private-receipts` bucket.
An optional public receipt must be redacted before upload—the CMS does not
redact or verify personal information in that image. Never place card details,
customer names, or other sensitive information in public images or visit notes.
Owner/editor RLS controls restaurant visits and private receipts.

The SEO audit checks configured article titles, descriptions, canonicals, and
indexing flags; it is not an external crawler. Analytics cards are connection
status only, not reports. No analytics connector or tracking script is enabled.

For a restaurant receipt, add the optional `receipt` object to the story. Only
verified fields should be provided; absent values are not rendered. Do not
publish demonstration text as firsthand reporting.

Optional article fields include `seoTitle`, `metaDescription`, `imageCaption`,
`author`, `publishedAt`, `updatedAt`, restaurant details, neighborhood context,
related story slugs, sponsored/affiliate flags, and video embeds. Video embeds
are restricted to YouTube's privacy-enhanced host or Vimeo's player host.
VideoObject data requires an original-video record with a verified thumbnail
and upload date; Restaurant JSON-LD requires a published story and verified
address details. The template creates a contents list for longer articles.

The initial stories are concepts only. Do not treat their titles, illustrations,
or copy as reports about real visits or business recommendations.

## Project structure

- `src/app/` — homepage, category pages, editorial pages, article routes, sitemap,
  robots, and site icon.
- `src/components/` — shared header/footer, story cards, article/category
  templates, image placeholders, and structured data.
- `src/lib/content.ts` — validated editorial data and section configuration.
- `src/lib/site.ts` — site name, canonical origin, description, and navigation.
- `public/art/` — original vector development artwork, not documentary photos.

## SEO and content safeguards

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

- Replace all concept copy with complete, fact-checked reporting; add named
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
