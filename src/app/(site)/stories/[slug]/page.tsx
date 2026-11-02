import type { Metadata } from "next";
import { articleMetadata, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("stories", slug);
}
export default async function StoryArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("stories", slug);
}
