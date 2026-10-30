import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: "en_US",
      images: [
        {
          url: `${SITE_URL}/art/las-vegas-night.svg`,
          alt: "Illustrated Las Vegas dusk, development artwork",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/art/las-vegas-night.svg`],
    },
  };
}
