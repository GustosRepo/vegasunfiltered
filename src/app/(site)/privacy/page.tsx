import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy | Vegas Unfiltered",
  description: "How Vegas Unfiltered handles website requests, advertising, and visitor choices.",
  path: "/privacy",
});

export default async function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="PLAIN-LANGUAGE PRIVACY"
      title="Privacy"
      intro="This notice describes the services used to deliver Vegas Unfiltered and advertising on our public pages."
      sections={[
        {
          heading: "Website requests",
          paragraphs: [
            "Our hosting and media providers process technical request information, such as IP addresses and browser details, to deliver and protect the website and its photos.",
            "There is no working newsletter signup or separate visitor analytics integration. The newsletter panel does not collect an email address. The editorial sign-in is for invited staff and uses cookies to maintain their sessions.",
          ],
        },
        {
          heading: "Advertising",
          paragraphs: [
            "Our homepage and eligible public reviews include Google AdSense advertising. When an ad loads, Google and its advertising partners may process information about your browser, device, IP address, and interactions, and may use cookies or similar technologies to serve and measure ads.",
            "The ads you see and the choices available depend on your location, consent, and Google's account and advertising settings. Where a Google privacy message is shown, use its controls to manage your choices. Google My Ad Center also provides advertising controls for your Google account.",
            "Advertising is labeled separately from our reviews. Advertisers do not determine our editorial scores or conclusions.",
          ],
        },
        {
          heading: "Your choices and future changes",
          paragraphs: [
            "Your browser provides controls for cookies and other website data. Restricting cookies or blocking advertising scripts may affect ad delivery.",
            "We update this notice when the services used by the website change.",
          ],
        },
      ]}
    >
      <div className="about-links">
        <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">How Google uses information from sites</a>
        <a href="https://myadcenter.google.com/" rel="noopener noreferrer" target="_blank">Google My Ad Center</a>
      </div>
    </InfoPage>
  );
}
