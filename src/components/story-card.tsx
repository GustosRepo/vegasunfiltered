import Link from "next/link";
import type { Story } from "@/lib/content";
import { EditorialArt } from "@/components/editorial-art";

type StoryCardProps = {
  story: Story;
  size?: "feature" | "standard" | "compact";
};

export function StoryCard({ story, size = "standard" }: StoryCardProps) {
  return (
    <article className={`story-card story-card-${size}`}>
      <Link className="story-card-link" href={`/${story.section}/${story.slug}`}>
        <EditorialArt alt={story.imageAlt} src={story.image} />
        <div className="story-copy">
          <span className="eyebrow">{story.label}</span>
          <h2>{story.title}</h2>
          <p>{story.dek}</p>
          <span className="story-read">
            {story.status === "draft" ? "DEMO DRAFT" : "READ THE STORY"}
            <span aria-hidden="true">↗</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
