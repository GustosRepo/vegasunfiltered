export const SITE_NAME = "Vegas Unfiltered";
export const SITE_URL = "https://vegasunfiltered.com";
export const SITE_DESCRIPTION =
  "Honest Las Vegas restaurant and activity reviews from a dad and husband. Real visits, real costs, and a practical take on what's worth your money.";
export const SITE_SHARE_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "Vegas Unfiltered — Real visits. Honest reviews. Your money matters.",
};

export const navigation = [
  { label: "Restaurants", href: "/restaurants" },
  { label: "Activities", href: "/activities" },
  { label: "About Us", href: "/about" },
] as const;
