import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import { AboutJsonLd } from "@/components/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "About Vegas Unfiltered | Honest Reviews, Real-Life Budgets",
  description:
    "Meet the dad and husband behind Vegas Unfiltered: honest Las Vegas reviews for people who care what a meal or a day out actually costs.",
  path: "/about",
});

export default async function AboutPage() {
  return (
    <><AboutJsonLd /><InfoPage
      eyebrow="A REAL PERSON. AN HONEST TAKE."
      title="About me"
      intro="I'm a dad and a husband who wants to help people decide where their money is worth spending in Las Vegas. No grand claims. Just real visits and honest reviews."
      sections={[
        {
          heading: "Why I started this",
          paragraphs: [
            "I got tired of looking for somewhere to eat and finding so much attention on expensive, high-end restaurants on the Strip. Those places have their audience, but they aren't the whole picture of Las Vegas.",
            "Especially in this economy, going out is a decision. If you're spending money on dinner or an activity, you deserve more than a pretty picture and a vague recommendation.",
          ],
        },
        {
          heading: "What you'll find here",
          paragraphs: [
            "I write about restaurants and activities I've actually tried, including outings with my wife. I'll tell you what we ordered or did, what it cost, what worked, what didn't, and whether I'd go back.",
            "This isn't about finding the cheapest option every time. It's about value: whether the experience makes sense for the money, the occasion, and the expectations you bring.",
            "The photos show part of the experience. The review is where I explain the rest.",
          ],
        },
        {
          heading: "My score is an opinion, not a promise",
          paragraphs: [
            "When I give a score out of 10, it's my own verdict on that visit, not an average of other people's ratings. Read the article for the reasons behind it.",
            "A great night for me might not be the right fit for you. My job is to give you enough detail to make your own decision, not pretend that one score tells you everything.",
          ],
        },
        {
          heading: "Honesty comes first",
          paragraphs: [
            "If a visit is hosted or a review is sponsored, I'll say so. If a link may earn a commission, that will be disclosed too. None of that buys a positive review or a higher score.",
            "I won't fill gaps with invented prices, visits, or experiences. I'd rather tell you what I don't know than give you false confidence about where to spend your money.",
          ],
        },
      ]}
    ><nav className="about-links" aria-label="Explore Vegas Unfiltered">
      <Link href="/restaurants">Restaurant reviews</Link>
      <Link href="/activities">Activity reviews</Link>
      <Link href="/editorial-policy">How I review</Link>
      <Link href="/affiliate-disclosure">Sponsorships and affiliate links</Link>
    </nav></InfoPage></>
  );
}
