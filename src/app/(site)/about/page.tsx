import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = pageMetadata({
  title: "About | Vegas Unfiltered",
  description:
    "What Vegas Unfiltered is building: independent stories about food, neighborhoods, and everyday Las Vegas.",
  path: "/about",
});

export default async function AboutPage() {
  return (
    <InfoPage
      eyebrow="A DIFFERENT KIND OF CITY GUIDE"
      title="About us"
      intro="Vegas Unfiltered is being built for people who want to meet the city beyond its best-known postcard."
      sections={[
        {
          heading: "The idea",
          paragraphs: [
            "We want to tell thoughtful stories about food, drink, neighborhoods, culture, and the ordinary details that make a city feel lived in.",
            "Our point of view is independent and curious—not a tourism brochure, booking service, or promise that every place is a hidden gem.",
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
