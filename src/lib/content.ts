export type Section = "restaurants" | "activities";
export type LegacySection = "eat" | "drink" | "explore" | "save" | "stories";

export function reviewSection(type: "restaurant" | "activity"): Section {
  return type === "restaurant" ? "restaurants" : "activities";
}

export function migrateSection(section: Section | LegacySection): Section {
  return section === "eat" || section === "drink" || section === "restaurants"
    ? "restaurants" : "activities";
}

export type Story = {
  slug: string;
  section: Section;
  title: string;
  seoTitle?: string;
  dek: string;
  metaDescription?: string;
  image: string;
  imageAlt: string;
  imageCaption?: string;
  label: string;
  status: "draft" | "published";
  tags: string[];
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  sponsored?: boolean;
  overallScore?: number | null;
  containsAffiliateLinks?: boolean;
  restaurant?: {
    name: string;
    neighborhood?: string;
    cuisine?: string;
    address?: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode?: string;
      addressCountry: string;
    };
    url?: string;
  };
  videos?: {
    embedUrl: string;
    title: string;
    caption?: string;
    originalVideo?: {
      thumbnailUrl: string;
      uploadDate: string;
      duration?: string;
      contentUrl?: string;
    };
  }[];
  body: { heading: string; paragraphs: string[] }[];
};

export const sections: Record<Section, { title: string; intro: string }> = {
  restaurants: {
    title: "Restaurants",
    intro: "Our meals, our stories, our verdicts. Restaurant reviews bring the food, drinks, atmosphere, and actual cost together in one place.",
  },
  activities: {
    title: "Activities",
    intro: "Things we do together around Las Vegas: the experience, the price, the story, and whether we would do it again.",
  },
};
