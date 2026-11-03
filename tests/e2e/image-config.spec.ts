import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test("image optimizer accepts the configured public editorial bucket and rejects other sources", () => {
  // Load the actual config in a fresh process with a public fixture origin.
  // This avoids using production credentials or making external requests.
  const results = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
    import config from './next.config.ts';
    import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern.js';
    const origin = 'https://editorial-fixture.supabase.co';
    const path = '/storage/v1/object/public/editorial-media/author/meal.jpg';
    const urls = [
      origin + path,
      origin + '/storage/v1/object/public/editorial-media/author/another-photo.webp',
      'https://another-project.supabase.co' + path,
      origin + '/storage/v1/object/public/private-receipts/receipt.jpg',
      origin + '/storage/v1/object/sign/editorial-media/meal.jpg?token=private',
      origin + path + '?token=unexpected',
      'http://editorial-fixture.supabase.co' + path,
      'https://editorial-fixture.supabase.co:8443' + path,
    ];
    console.log(JSON.stringify(urls.map(url => hasRemoteMatch([], config.images.remotePatterns, new URL(url)))));
  `], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "https://editorial-fixture.supabase.co" },
    encoding: "utf8",
  }));
  expect(results).toEqual([true, true, false, false, false, false, false, false]);
});
