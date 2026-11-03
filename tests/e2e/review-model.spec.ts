import { test, expect } from "@playwright/test";
import { articleDraftSchema, isEditorDocument, neighborhoodSchema, restaurantSchema, reviewTemplateSchema } from "../../src/lib/cms-schemas";
import { migrateSection, reviewSection } from "../../src/lib/content";
import { blankReviewDocument, blankReviewTemplate, hasReviewContent, quickVerdictPreview, readReviewTemplate, reviewPlainText, withoutRepeatedSectionLabel, withReviewTemplate } from "../../src/lib/review-template";

test("neighborhood slugs normalize common input and explain unsupported characters", () => {
  const slug = neighborhoodSchema.shape.slug;
  for (const [input, expected] of [
    ["Spring Valley", "spring-valley"], ["  Arts_District  ", "arts-district"],
    ["--Downtown---Las Vegas--", "downtown-las-vegas"], ["Café", "cafe"],
    ["spring-valley", "spring-valley"], ["District 1", "district-1"],
  ]) expect(slug.parse(input)).toBe(expected);
  for (const input of ["", "  ", "---", "!!!", "Spring/Valley", "Vegas?"]) {
    const result = slug.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toContain("Enter a neighborhood slug");
  }
});

test("editorial scores are optional, accept boundaries, and reject invalid precision", () => {
  const score = articleDraftSchema.shape.overallScore;
  for (const value of ["", 0, 0.1, 8.5, 9.9, 10]) {
    expect(score.safeParse(value).success).toBe(true);
  }
  for (const value of [-0.1, 10.1, 8.55, Number.NaN, Number.POSITIVE_INFINITY, null, "8.5"]) {
    expect(score.safeParse(value).success).toBe(false);
  }
});

test("review and place types have the same two choices", () => {
  for (const value of ["restaurant", "activity"]) {
    expect(articleDraftSchema.shape.reviewType.safeParse(value).success).toBe(true);
    expect(restaurantSchema.shape.placeType.safeParse(value).success).toBe(true);
  }
  for (const value of ["eat", "stories", "", null]) {
    expect(articleDraftSchema.shape.reviewType.safeParse(value).success).toBe(false);
    expect(restaurantSchema.shape.placeType.safeParse(value).success).toBe(false);
  }
});

test("legacy sections retain their review destinations", () => {
  expect(reviewSection("restaurant")).toBe("restaurants");
  expect(reviewSection("activity")).toBe("activities");
  for (const value of ["eat", "drink"] as const) expect(migrateSection(value)).toBe("restaurants");
  for (const value of ["explore", "save", "stories"] as const) expect(migrateSection(value)).toBe("activities");
});

test("review template preserves legacy body and round-trips optional sections", () => {
  const body = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Our original review." }] }] };
  expect(readReviewTemplate(body)).toBeNull();
  expect(withReviewTemplate(body)).toEqual(body);
  const template = { ...blankReviewTemplate(), quickVerdict: "Worth a return visit.", visitedAt: "2026-11-02", bestFor: "Date night", tried: body };
  const saved = withReviewTemplate(body, template);
  expect(saved.content).toEqual(body.content);
  expect(body).not.toHaveProperty("attrs");
  expect(isEditorDocument(saved)).toBe(true);
  expect(readReviewTemplate(JSON.parse(JSON.stringify(saved)))).toEqual(template);
  expect(reviewPlainText(saved)).toContain("Worth a return visit.");
  expect(reviewPlainText(saved)).toContain("Our original review.");
  expect(hasReviewContent(blankReviewDocument())).toBe(false);
  expect(hasReviewContent(body)).toBe(true);
  expect(hasReviewContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "  \n " }] }] })).toBe(false);
  expect(hasReviewContent({ type: "image", attrs: { src: "/photo.png" } })).toBe(true);
});

test("review template validates dates, photos, limits, and rich text without nested templates", () => {
  const template = blankReviewTemplate();
  const photo = { mediaId: "123e4567-e89b-42d3-a456-426614174000", url: "/photo.png", altText: "Dinner", caption: "Our meal", credit: "Us" };
  expect(reviewTemplateSchema.safeParse({ ...template, gallery: [photo] }).success).toBe(true);
  expect(reviewTemplateSchema.safeParse({ ...template, gallery: [{ ...photo, url: "http://127.0.0.1:55421/storage/photo.png" }] }).success).toBe(true);
  for (const patch of [
    { version: 2 }, { visitedAt: "2026-02-30" }, { quickVerdict: "x".repeat(1501) },
    { gallery: [photo, photo] }, { gallery: [{ ...photo, altText: " " }] },
    { gallery: [{ ...photo, url: "javascript:alert(1)" }] },
    { gallery: [{ ...photo, url: "http://example.com/photo.jpg" }] },
    { gallery: Array.from({ length: 51 }, (_, index) => ({ ...photo, mediaId: `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}` })) },
    { tried: { type: "doc", content: [{ type: "script", text: "bad" }] } },
    { tried: withReviewTemplate(blankReviewDocument(), template) },
  ]) {
    expect(reviewTemplateSchema.safeParse({ ...template, ...patch }).success).toBe(false);
    expect(isEditorDocument({ ...blankReviewDocument(), attrs: { reviewTemplate: { ...template, ...patch } } })).toBe(false);
  }
});

test("quick verdict previews stay short without losing the rest of a saved verdict", () => {
  expect(quickVerdictPreview("  ")).toEqual({ summary: "", remainder: "" });
  expect(quickVerdictPreview("Worth $4.25? Yes, for us. More details follow.")).toEqual({ summary: "Worth $4.25? Yes, for us.", remainder: "More details follow." });
  expect(quickVerdictPreview("Yes, we'd return.\n\nHere is why.")).toEqual({ summary: "Yes, we'd return.", remainder: "Here is why." });
  const long = "A thoughtful dinner with generous portions and friendly service ".repeat(12).trim();
  const preview = quickVerdictPreview(long);
  expect(preview.summary.length).toBeLessThanOrEqual(280);
  expect(`${preview.summary} ${preview.remainder}`).toBe(long);
});

test("only a repeated leading section label is hidden; distinct headings and stored content stay intact", () => {
  const body = { type: "doc", content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What We Ordered:" }] },
    { type: "paragraph", content: [{ type: "text", text: "Two tacos and a drink." }] },
  ] };
  expect(withoutRepeatedSectionLabel(body, ["What we tried", "What we ordered"]).content).toEqual(body.content.slice(1));
  expect(body.content).toHaveLength(2);
  expect(withoutRepeatedSectionLabel(body, ["Before you go"])).toBe(body);
  const paragraph = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "What we ordered" }] }] };
  expect(withoutRepeatedSectionLabel(paragraph, ["What we ordered"])).toBe(paragraph);
});
