import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Affiliate Disclosure | Vegas Unfiltered",
  description: "Our policy on affiliate links and other commercial relationships.",
  path: "/affiliate-disclosure",
});

export default async function AffiliateDisclosurePage() {
  return (
    <InfoPage
      eyebrow="TRANSPARENCY, ALWAYS"
      title="Affiliate disclosure"
      intro="There are no affiliate links or affiliate tracking on this development preview."
      sections={[
        {
          heading: "If that changes",
          paragraphs: [
            "If we use an affiliate link in the future, we will identify it clearly near the relevant recommendation. A commission will not determine whether an experience receives coverage or what we say about it.",
            "Any paid placement or sponsored story will be labeled as sponsored and distinguished from independent editorial work.",
          ],
        },
      ]}
    />
  );
}
