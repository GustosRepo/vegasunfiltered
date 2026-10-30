import type { Metadata } from "next";
import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("explore"); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("explore", slug);
}
export default async function ExploreArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("explore", slug);
}
