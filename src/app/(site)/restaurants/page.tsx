import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata() {
  return sectionMetadata("restaurants", "Las Vegas Restaurant Reviews", "Honest Las Vegas restaurant reviews with what we ordered, what we spent, and whether we'd go back. A practical look beyond high-end Strip dining.");
}

export default function RestaurantsPage() {
  return <CategoryPage section="restaurants" />;
}
