import type { Metadata } from "next";
import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("eat", "Eat", "Las Vegas food stories and neighborhood guides.");
}

export default async function EatPage() {
  return <CategoryPage section="eat" />;
}
