import type { Section } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export function getArticleCanonicalUrl({ categorySlug, slug }: { categorySlug: Section; slug: string }): string {
  // Review URLs are automatic. Legacy saved overrides never change this value.
  return `${SITE_URL}/${categorySlug}/${slug}`;
}
