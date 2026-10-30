import type { Metadata } from "next";
import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("stories", "Stories", "Documentary-style Las Vegas stories.");
}

export default async function StoriesPage() {
  return <CategoryPage section="stories" />;
}
