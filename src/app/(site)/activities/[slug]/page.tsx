import { articleMetadata, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  return articleMetadata("activities", (await params).slug);
}
export default async function ActivityReview({ params }: Props) {
  return renderArticleRoute("activities", (await params).slug);
}
