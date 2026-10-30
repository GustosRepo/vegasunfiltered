import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy | Vegas Unfiltered",
  description: "How the Vegas Unfiltered development preview handles visitor data.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="PLAIN-LANGUAGE PRIVACY"
      title="Privacy"
      intro="This development preview does not ask you to create an account or submit personal information."
      sections={[
        {
          heading: "Forms, analytics, and advertising",
          paragraphs: [
            "There is no working newsletter signup, advertising network, affiliate tracking, or analytics integration on this preview. The newsletter panel is informational only and does not collect an email address.",
            "The hosting provider may process technical request data to deliver and protect the website. Configure and document any additional analytics, advertising, or email services before enabling them.",
          ],
        },
        {
          heading: "Changes before launch",
          paragraphs: [
            "This notice describes the current preview, not every service that might be added later. If the site begins collecting information, this policy must be updated to identify what is collected, why, and how visitors can contact the publisher.",
          ],
        },
      ]}
    />
  );
}
