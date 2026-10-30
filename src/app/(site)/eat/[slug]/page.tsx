import type { Metadata } from "next";
import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("eat"); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("eat", slug);
}
export default async function EatArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("eat", slug);
}
