import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata() {
  return sectionMetadata("restaurants", "Restaurant Reviews", "Our firsthand Las Vegas restaurant reviews: food, drinks, atmosphere, actual costs, and verdicts.");
}

export default function RestaurantsPage() {
  return <CategoryPage section="restaurants" />;
}
