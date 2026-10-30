import type { Metadata } from "next";
import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("drink"); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("drink", slug);
}
export default async function DrinkArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("drink", slug);
}
