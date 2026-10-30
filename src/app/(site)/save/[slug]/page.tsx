import type { Metadata } from "next";
import { articleMetadata, articleStaticParams, renderArticleRoute } from "@/lib/article-route";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return articleStaticParams("save"); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata("save", slug);
}
export default async function SaveArticle({ params }: Props) {
  const { slug } = await params;
  return renderArticleRoute("save", slug);
}
