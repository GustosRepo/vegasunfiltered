import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Editorial Policy | Vegas Unfiltered",
  description:
    "Our standards for firsthand reporting, accurate prices, corrections, and sponsored content.",
  path: "/editorial-policy",
});

export default async function EditorialPolicyPage() {
  return (
    <InfoPage
      eyebrow="HOW WE EARN YOUR TRUST"
      title="Editorial policy"
      intro="A useful recommendation should be grounded in real reporting. That is the standard we are setting before the first story goes live."
      sections={[
        {
          heading: "Firsthand means firsthand",
          paragraphs: [
            "We will not claim to have visited a restaurant, attended an event, spoken with a source, or tested an experience unless we actually did. Demonstration pages are labeled and excluded from search indexing.",
            "Our guides will distinguish firsthand reporting from background information and will be checked for accuracy before publication.",
          ],
        },
        {
          heading: "Prices and the receipt",
          paragraphs: [
            "We will date reported prices and explain what a total includes. Restaurant receipts and visit details will be shown only when verified; missing information will stay missing rather than be guessed.",
          ],
        },
        {
          heading: "Independence and corrections",
          paragraphs: [
            "Payment or a potential partnership will not buy a favorable review. Sponsored work will be clearly labeled and kept distinct from independent editorial coverage.",
            "When a published story needs a meaningful correction, we will update it transparently. A public correction contact will be added before the site begins publishing.",
          ],
        },
      ]}
    />
  );
}
