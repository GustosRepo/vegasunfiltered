import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "About | Vegas Unfiltered",
  description:
    "A couple's firsthand restaurant and activity reviews from Las Vegas, with real costs and honest verdicts.",
  path: "/about",
});

export default async function AboutPage() {
  return (
    <InfoPage
      eyebrow="OUR TIME OUT. OUR HONEST TAKE."
      title="About us"
      intro="We are a couple sharing our experiences at Las Vegas restaurants and activities: the good, the disappointing, and the details that make a night out worth it."
      sections={[
        {
          heading: "The idea",
          paragraphs: [
            "Our reviews combine the story of our visit with what we ate, drank, or did, what it cost, and whether we would return. Social content captures the moment; the article gives you the full context.",
            "An optional score out of 10 is our editorial opinion, not a customer average. Hosted visits and sponsorships are disclosed, and compensation never guarantees praise.",
          ],
        },
        {
          heading: "Where we are now",
          paragraphs: [
            "This website is an early development preview. Its articles and illustrations are clearly marked demonstrations, not published reporting. No restaurant visits, prices, quotations, or reviews have been invented as evidence.",
            "We will publish original work only when it is ready to meet the standards described in our editorial policy.",
          ],
        },
      ]}
    />
  );
}
