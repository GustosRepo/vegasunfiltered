import { HomeContent } from "@/components/home-content";
import { pageMetadata } from "@/lib/page-metadata";
import { SITE_DESCRIPTION } from "@/lib/site";
import { getPublishedCmsArticles, toStorySummary } from "@/lib/cms-content";

export const metadata = pageMetadata({
  title: "Honest Las Vegas Restaurant & Activity Reviews | Vegas Unfiltered",
  description: SITE_DESCRIPTION,
  path: "",
});

export default async function Home() {
  const published = (await getPublishedCmsArticles()).map(toStorySummary);
  return <HomeContent reviews={published} />;
}
