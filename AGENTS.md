<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Permanent review layout rules

All existing and new restaurant/activity articles and private previews must use
`CmsPublishedArticle` and the shared sections in `src/lib/review-template.ts`.
Do not create per-slug layouts or a separate format for future articles.

Keep this order: concise headline + optional editorial score, short quick
verdict, byline, cover photo, one consolidated practical-details panel,
section jump links, full review, additional photos, optional public receipts
and disclosures, then related published reviews/category navigation.

- Keep the verdict above the cover. Show a short opening (at most 280 characters,
  up to two sentences); preserve longer saved text in an accessible disclosure.
- Use one practical-details panel for the exact branch/address, public budget,
  best-for, neighborhood, and visit date. Show Directions for saved addresses
  and the official website when available. Never infer prices, opening hours,
  scores, or facts from private visit/receipt data.
- Narrative sections are Our experience, What we tried, Before you go, and
  Would we go back? Omit empty sections and generate links only for sections
  that exist. Maintain anchor offsets for the sticky header and 44px targets.
- The renderer supplies headings. Hide only exact, redundant leading labels;
  preserve distinct subheadings and all saved content. Editorial prompts must
  ask for a direct yes/no and reason in the return verdict.
- Do not append a decorative period after existing headline punctuation.
  Keep titles compact, body text readable, and details aligned with the reading
  column at desktop and mobile widths. Review/preview styles live only in
  `src/app/globals.css`; do not duplicate them in the admin stylesheet.
- Exclude the cover image from the additional gallery without deleting saved
  selections. Hide an empty gallery. Do not display placeholder social links.
- Related links must use real, indexable published reviews, exclude the current
  review, and match its section. Private previews must not fetch public feeds.
- Use `getArticleCanonicalUrl` for article canonical metadata, social URLs,
  structured data, and editor previews. Always generate the URL from the
  production origin, current review type, and slug. There is no editable
  canonical field. Ignore legacy overrides and clear them on review save;
  do not reintroduce manual overrides without the owner's explicit request.

Preserve these rules when extending the CMS. Update the shared editor prompts,
README, and regression coverage if the owner approves a future format change.
Run `npx tsc --noEmit` and `npm run test:e2e:public`; the isolated public suite
checks this contract on both desktop and mobile without production credentials.
