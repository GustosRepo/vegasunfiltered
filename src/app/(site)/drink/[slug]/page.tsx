import type { Metadata } from "next";
import { articleMetadata, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("drink", slug);
}
export default async function DrinkArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("drink", slug);
}
