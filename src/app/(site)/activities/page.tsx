import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata() {
  return sectionMetadata("activities", "Activity Reviews", "Our firsthand Las Vegas activity reviews: what we did, what it cost, and whether we would do it again.");
}

export default function ActivitiesPage() {
  return <CategoryPage section="activities" />;
}
