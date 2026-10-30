import type { Metadata } from "next";
import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("explore", "Explore", "Neighborhoods and experiences around Las Vegas.");
}

export default async function ExplorePage() {
  return <CategoryPage section="explore" />;
}
