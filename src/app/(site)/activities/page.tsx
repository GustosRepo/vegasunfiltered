import { CategoryPage } from "@/components/category-page";
import { sectionMetadata } from "@/lib/section-metadata";

export async function generateMetadata() {
  return sectionMetadata("activities", "Las Vegas Activity Reviews", "Firsthand reviews of Las Vegas activities and things to do. What the experience was like, what it cost, and whether it was worth the money.");
}

export default function ActivitiesPage() {
  return <CategoryPage section="activities" />;
}
