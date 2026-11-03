import { test as base, expect, type BrowserContext } from "@playwright/test";

export async function blockRealAds(context: BrowserContext) {
  await context.route(/^https:\/\/[^/]*(?:googlesyndication\.com|doubleclick\.net|fundingchoicesmessages\.google\.com)\//,
    (route) => route.abort("blockedbyclient"));
}

// Explicit page-level mocks override this default. No browser suite requests
// real ad delivery, including authenticated CMS tests and populated homepages.
export const test = base.extend({
  context: async ({ context }, provide) => {
    await blockRealAds(context);
    await provide(context);
  },
});

export { expect };
export type { Page } from "@playwright/test";
