import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("restaurants"); }
export async function generateMetadata({ params }: Props) {
  return articleMetadata("restaurants", (await params).slug);
}
export default async function RestaurantReview({ params }: Props) {
  return renderArticleRoute("restaurants", (await params).slug);
}
