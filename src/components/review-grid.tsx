"use client";

import { useState } from "react";
import type { Story } from "@/lib/content";
import { StoryCard } from "@/components/story-card";

export function ReviewGrid({ reviews }: { reviews: Story[] }) {
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const visible = reviews.filter((review) =>
    `${review.title} ${review.dek} ${review.tags.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()),
  ).toSorted((a, b) => sort === "score"
    ? (b.overallScore ?? -1) - (a.overallScore ?? -1)
    : (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return (
    <div>
      <div className="review-filters">
        <label>Find a review<input onChange={(event) => setSearch(event.target.value)} type="search" value={search} /></label>
        <label>Sort reviews<select onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="latest">Latest reviews</option><option value="score">Highest editorial score</option>
        </select></label>
      </div>
      <p className="image-caption">Scores are our editorial opinions, not customer averages. Unscored reviews appear last when sorting by score.</p>
      <div className="category-story-grid">{visible.map((review) => <StoryCard key={review.slug} story={review} />)}</div>
      {!visible.length && <p>No reviews match your search.</p>}
    </div>
  );
}
