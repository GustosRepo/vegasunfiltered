export type Section = "eat" | "drink" | "explore" | "save" | "stories";

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
  neighborhood?: { name: string; summary: string };
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
  relatedStories?: string[];
  body: { heading: string; paragraphs: string[] }[];
  receipt?: {
    restaurantName?: string;
    neighborhood?: string;
    cuisine?: string;
    foodTotal?: number;
    drinks?: number;
    tax?: number;
    tip?: number;
    finalTotal?: number;
    partySize?: number;
    visitedOn?: string;
    parking?: string;
    wouldReturn?: string;
    verdict?: string;
  };
};

export const sections: Record<
  Section,
  { title: string; intro: string; image: string }
> = {
  eat: {
    title: "Eat",
    intro:
      "Good meals don’t need a velvet rope. This is where future neighborhood guides, honest restaurant reporting, and late-night cravings will live.",
    image: "/art/diner.svg",
  },
  drink: {
    title: "Drink",
    intro:
      "From a long lunch that turns into a late one to the last good bar still pouring, the best nights start with a point of view.",
    image: "/art/night-market.svg",
  },
  explore: {
    title: "Explore",
    intro:
      "The city opens up when you leave the obvious route. Meet the neighborhoods, creative corners, and everyday places that make Las Vegas a place to live.",
    image: "/art/chinatown.svg",
  },
  save: {
    title: "Save",
    intro:
      "A good time should not require a big spend. We’re building practical ideas for making every dollar—and every hour—go further.",
    image: "/art/desert-road.svg",
  },
  stories: {
    title: "Stories",
    intro:
      "Reported with curiosity, told with care. These are the people, places, and small moments behind a city that is more than its postcard.",
    image: "/art/downtown.svg",
  },
};

export const stories: Story[] = [
  {
    slug: "cheap-eats-las-vegas",
    section: "eat",
    title: "Cheap Eats in Las Vegas",
    dek: "A field guide to the meals worth leaving room—and budget—for.",
    image: "/art/diner.svg",
    imageAlt: "Illustrated neighborhood diner, original development artwork",
    label: "THE NEIGHBORHOOD TABLE",
    status: "draft",
    tags: ["Cheap Eats", "Food"],
    body: [
      {
        heading: "A guide built around the good stuff",
        paragraphs: [
          "This is a concept draft, not a reported restaurant guide. Before publication, every pick needs a real visit, a current menu check, and enough detail to help someone decide where to spend their time.",
          "The finished guide will make room for the small things that matter: what to order, how much it costs today, when to go, and what makes a place feel like itself.",
        ],
      },
      {
        heading: "No guesswork on the bill",
        paragraphs: [
          "Prices change. Any future totals will be tied to a dated receipt and explained clearly, including tax, tip, party size, and what was actually ordered.",
        ],
      },
    ],
  },
  {
    slug: "las-vegas-happy-hours",
    section: "drink",
    title: "Happy Hours Worth the Detour",
    dek: "A future guide to an early drink that feels like the start of the night.",
    image: "/art/night-market.svg",
    imageAlt: "Illustrated warm-lit Las Vegas street at dusk, original development artwork",
    label: "A DRINK, NOT A DEAL",
    status: "draft",
    tags: ["Drinks", "After Hours"],
    body: [
      {
        heading: "The hour is only half the story",
        paragraphs: [
          "This concept page is not a list of verified specials. A real guide will check current hours and menus directly with each business before it goes live.",
          "We’ll look for places with their own rhythm, not just a discount. The room, the people, and what you can actually order matter as much as the price.",
        ],
      },
    ],
  },
  {
    slug: "chinatown-las-vegas",
    section: "explore",
    title: "A First-Timer’s Chinatown Field Guide",
    dek: "A neighborhood deserves more than a quick stop and a camera roll.",
    image: "/art/chinatown.svg",
    imageAlt: "Illustrated Chinatown street scene, original development artwork",
    label: "NEIGHBORHOOD NOTES",
    status: "draft",
    tags: ["Chinatown", "Neighborhoods"],
    body: [
      {
        heading: "Come curious, leave room",
        paragraphs: [
          "This is a planning draft, not a reported itinerary. It avoids naming businesses or claiming local knowledge until the route has been walked and the people behind it have been heard from.",
          "A useful neighborhood guide should help visitors slow down: understand the shape of an area, move respectfully, and find their own reasons to come back.",
        ],
      },
    ],
  },
  {
    slug: "las-vegas-on-a-budget",
    section: "save",
    title: "A More Thoughtful Vegas on a Budget",
    dek: "A good day out is made of choices, not a price tag.",
    image: "/art/desert-road.svg",
    imageAlt: "Illustrated desert road outside the city, original development artwork",
    label: "SPEND WITH INTENTION",
    status: "draft",
    tags: ["Budget", "Planning"],
    body: [
      {
        heading: "Practical, not penny-pinching",
        paragraphs: [
          "This concept draft will become a useful, current guide only after every recommendation is checked. No invented prices, secret deals, or supposedly free experiences.",
          "The goal is to make room for the tradeoffs: what costs money, what needs a reservation, how far apart places are, and what a realistic day might look like.",
        ],
      },
    ],
  },
  {
    slug: "friday-night-in-chinatown",
    section: "stories",
    title: "A Friday Night in Chinatown",
    dek: "A story shaped by the conversations, meals, and unexpected turns of one evening.",
    image: "/art/downtown.svg",
    imageAlt: "Illustrated neon-lit Las Vegas street, original development artwork",
    label: "A STORY IN THE MAKING",
    status: "draft",
    tags: ["Chinatown", "Nightlife", "Firsthand story"],
    body: [
      {
        heading: "The reporting comes first",
        paragraphs: [
          "This is a story concept, not a firsthand account. No visit, conversation, meal, or quote has been invented for this placeholder.",
          "When reported, this story will follow one evening with permission and context—letting the people and places involved speak for themselves.",
        ],
      },
    ],
  },
];

export function getStory(section: string, slug: string) {
  return stories.find(
    (story) => story.section === section && story.slug === slug,
  );
}

export function getStoriesForSection(section: Section) {
  return stories.filter((story) => story.section === section);
}

export function getPublishedStoriesForSection(section: Section) {
  return getStoriesForSection(section).filter(
    (story) => story.status === "published",
  );
}

export function validateStory(story: Story) {
  const isValidDate = (date: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(story.slug)) {
    throw new Error(`Invalid story slug: ${story.slug}`);
  }
  if (
    !story.title.trim() ||
    !story.dek.trim() ||
    !story.imageAlt.trim() ||
    !story.image.startsWith("/") ||
    story.image.startsWith("//")
  ) {
    throw new Error(`Story "${story.slug}" is missing editorial metadata.`);
  }
  if (
    !story.body.length ||
    story.body.some(
      (block) =>
        !block.heading.trim() ||
        !block.paragraphs.length ||
        block.paragraphs.some((paragraph) => !paragraph.trim()),
    )
  ) {
    throw new Error(`Story "${story.slug}" needs complete body sections.`);
  }
  if (
    story.status === "published" &&
    (!story.author ||
      !story.publishedAt ||
      !isValidDate(story.publishedAt))
  ) {
    throw new Error(
      `Published story "${story.slug}" needs a named author and valid publication date.`,
    );
  }
  if (
    story.updatedAt &&
    (!isValidDate(story.updatedAt) ||
      (story.publishedAt && story.updatedAt < story.publishedAt))
  ) {
    throw new Error(`Story "${story.slug}" has an invalid updatedAt date.`);
  }
  if (story.restaurant?.url && !isHttpsUrl(story.restaurant.url)) {
    throw new Error(`Story "${story.slug}" has an invalid restaurant URL.`);
  }
  if (
    story.restaurant &&
    (!story.restaurant.name.trim() ||
      (story.restaurant.address &&
        [
          story.restaurant.address.streetAddress,
          story.restaurant.address.addressLocality,
          story.restaurant.address.addressRegion,
          story.restaurant.address.addressCountry,
        ].some((value) => !value.trim())))
  ) {
    throw new Error(`Story "${story.slug}" has incomplete restaurant details.`);
  }
  if (
    story.videos?.some(
      (video) =>
        !video.title.trim() ||
        !isAllowedVideoUrl(video.embedUrl) ||
        (video.originalVideo &&
          (!isHttpsUrl(video.originalVideo.thumbnailUrl) ||
            !isValidDate(video.originalVideo.uploadDate) ||
            (video.originalVideo.duration !== undefined &&
              !/^PT(?=\d)(\d+H)?(\d+M)?(\d+S)?$/.test(
                video.originalVideo.duration,
              )) ||
            (video.originalVideo.contentUrl !== undefined &&
              !isHttpsUrl(video.originalVideo.contentUrl)))),
    )
  ) {
    throw new Error(`Story "${story.slug}" has an invalid video embed.`);
  }
  if (
    story.relatedStories?.some(
      (slug) =>
        slug === story.slug ||
        !stories.some((related) => related.slug === slug),
    )
  ) {
    throw new Error(`Story "${story.slug}" has an invalid related story.`);
  }
  return story;
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ["www.youtube-nocookie.com", "player.vimeo.com"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

stories.forEach(validateStory);
