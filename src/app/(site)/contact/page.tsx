import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact | Vegas Unfiltered",
  description: "Contact information for Vegas Unfiltered is coming soon.",
  path: "/contact",
  index: false,
});

export default async function ContactPage() {
  return (
    <InfoPage
      eyebrow="SAY HELLO"
      title="Contact"
      intro="Our public contact channel is not set up yet."
      sections={[
        {
          heading: "Coming before publication",
          paragraphs: [
            "We will add a monitored editorial contact address before accepting story tips, corrections, or business inquiries. We do not publish an unmonitored or invented address.",
            "Please do not send confidential or time-sensitive information through this development preview.",
          ],
        },
      ]}
    />
  );
}
