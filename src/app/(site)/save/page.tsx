import type { Metadata } from "next";
import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return sectionMetadata("save", "Save", "Practical Las Vegas budget guides.");
}

export default async function SavePage() {
  return <CategoryPage section="save" />;
}
