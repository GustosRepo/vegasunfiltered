import type { Metadata } from "next";
import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("stories"); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("stories", slug);
}
export default async function StoryArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("stories", slug);
}
