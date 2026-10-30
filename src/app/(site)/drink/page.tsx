import type { Metadata } from "next";
import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("drink", "Drink", "Las Vegas bar and drinks coverage.");
}

export default async function DrinkPage() {
  return <CategoryPage section="drink" />;
}
