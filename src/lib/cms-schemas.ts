import { z } from "zod";

const allowedNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
  "youtube",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
]);
const allowedMarks = new Set(["bold", "italic", "strike", "code", "link"]);
const allowedAttributes = new Set([
  "href",
  "target",
  "rel",
  "class",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "start",
  "colspan",
  "rowspan",
  "colwidth",
  "level",
  "language",
  "data-youtube-video",
]);

type JsonRecord = { [key: string]: unknown };
export type EditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeUrl(value: unknown, allowEmbed = false): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!allowEmbed) return true;
    return [
      "www.youtube-nocookie.com",
      "youtube-nocookie.com",
      "www.youtube.com",
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "www.youtu.be",
    ].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getYoutubeEmbedUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!isSafeUrl(value, true) || url.protocol !== "https:") return null;
  const videoId = url.hostname.endsWith("youtu.be")
    ? url.pathname.split("/").filter(Boolean)[0]
    : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ??
      url.searchParams.get("v");
  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) return null;
  const embed = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  const start = Number(url.searchParams.get("start") ?? url.searchParams.get("t")?.replace(/s$/, ""));
  if (Number.isInteger(start) && start > 0) embed.searchParams.set("start", String(start));
  return embed.toString();
}

function validateNode(value: unknown, depth: number, budget: { count: number }): value is EditorNode {
  budget.count += 1;
  if (budget.count > 12000 || depth > 30 || !isRecord(value)) return false;
  if (typeof value.type !== "string" || !allowedNodes.has(value.type)) return false;
  if (value.text !== undefined && (typeof value.text !== "string" || value.text.length > 100000)) return false;
  if (value.attrs !== undefined) {
    if (!isRecord(value.attrs) || Object.keys(value.attrs).some((key) => !allowedAttributes.has(key))) return false;
  }
  if (value.type === "heading" && ![2, 3, 4].includes(Number((value.attrs as JsonRecord | undefined)?.level))) return false;
  if (value.type === "image" && !isSafeUrl((value.attrs as JsonRecord | undefined)?.src)) return false;
  if (value.type === "youtube" && !isSafeUrl((value.attrs as JsonRecord | undefined)?.src, true)) return false;
  if (value.type === "text" && typeof value.text !== "string") return false;
  if (value.content !== undefined) {
    if (!Array.isArray(value.content) || !value.content.every((node) => validateNode(node, depth + 1, budget))) return false;
  }
  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks)) return false;
    for (const mark of value.marks) {
      if (!isRecord(mark) || typeof mark.type !== "string" || !allowedMarks.has(mark.type)) return false;
      if (mark.type === "link" && (!isRecord(mark.attrs) || !isSafeUrl(mark.attrs.href))) return false;
      if (mark.attrs !== undefined && (
        !isRecord(mark.attrs) ||
        Object.keys(mark.attrs).some((key) => !allowedAttributes.has(key))
      )) return false;
    }
  }
  return true;
}

export function isEditorDocument(value: unknown): value is EditorNode {
  if (
    !isRecord(value) ||
    value.type !== "doc" ||
    !Array.isArray(value.content)
  ) return false;
  const budget = { count: 0 };
  return validateNode(value, 0, budget);
}

export const articleDraftSchema = z.object({
  id: z.string().uuid().optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  title: z.string().trim().min(3).max(160),
  subtitle: z.string().trim().max(240),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum([
    "editorial_story",
    "restaurant_review",
    "seo_guide",
    "neighborhood_guide",
    "experience_review",
  ]),
  categoryId: z.union([z.string().uuid(), z.literal("")]),
  tags: z.string().max(500),
  seoTitle: z.string().trim().max(70),
  metaDescription: z.string().trim().max(180),
  canonicalUrl: z.string().trim().max(2048),
  primaryKeyword: z.string().trim().max(100),
  secondaryKeywords: z.string().max(500),
  internalLinkingNotes: z.string().max(5000),
  indexingEnabled: z.boolean(),
  content: z.custom<EditorNode>(isEditorDocument, "Article content is invalid."),
});

export const restaurantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000),
  cuisine: z.string().max(120),
  neighborhoodId: z.union([z.string().uuid(), z.literal("")]),
  address: z.string().max(250),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  postalCode: z.string().max(20),
  website: z.union([z.literal(""), z.string().url().max(2048)]),
  phone: z.string().max(40),
  priceRange: z.enum(["", "$", "$$", "$$$", "$$$$"]),
  parkingInformation: z.string().max(2000),
  reservationInformation: z.string().max(2000),
  internalNotes: z.string().max(5000),
});

export const restaurantVisitSchema = z.object({
  id: z.string().uuid().optional(),
  restaurantId: z.string().uuid(),
  visitedAt: z.string().date(),
  partySize: z.coerce.number().int().min(1).max(100),
  foodSubtotal: z.coerce.number().min(0).max(100000),
  drinksSubtotal: z.coerce.number().min(0).max(100000),
  additionalCharges: z.coerce.number().min(0).max(100000),
  salesTax: z.coerce.number().min(0).max(100000),
  tip: z.coerce.number().min(0).max(100000),
  manualTotalOverride: z.union([z.literal(""), z.coerce.number().min(0).max(100000)]),
  experienceNotes: z.string().max(10000),
  wouldReturn: z.enum(["", "yes", "no"]),
  editorialVerdict: z.string().max(2000),
  articleId: z.union([z.string().uuid(), z.literal("")]),
});
