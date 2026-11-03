import { isEditorDocument, reviewTemplateSchema, type EditorNode, type ReviewTemplate } from "@/lib/cms-schemas";

export function blankReviewDocument(): EditorNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function blankReviewTemplate(): ReviewTemplate {
  return {
    version: 1, quickVerdict: "", visitedAt: "", priceRange: "", bestFor: "",
    tried: blankReviewDocument(), worthKnowing: blankReviewDocument(), returnVerdict: blankReviewDocument(),
    gallery: [],
  };
}

export function readReviewTemplate(content: unknown): ReviewTemplate | null {
  if (!isEditorDocument(content)) throw new Error("Review contains invalid rich text.");
  if (content.attrs?.reviewTemplate === undefined) return null;
  return reviewTemplateSchema.parse(content.attrs.reviewTemplate);
}

export function withReviewTemplate(content: EditorNode, template?: ReviewTemplate): EditorNode {
  if (!template) return content;
  return { ...content, attrs: { ...content.attrs, reviewTemplate: template } };
}

export function hasReviewContent(content: EditorNode): boolean {
  return Boolean(content.text?.trim()) || ["image", "youtube", "table", "horizontalRule"].includes(content.type)
    || Boolean(content.content?.some(hasReviewContent));
}

export function hasSubstantialReviewExperience(content: EditorNode): boolean {
  let paragraphs = 0;
  const text = (node: EditorNode): string => {
    if (node.type === "paragraph" && hasReviewContent(node)) paragraphs += 1;
    return [node.text ?? "", ...(node.content ?? []).map(text)].join(" ");
  };
  const words = text(content).trim().split(/\s+/).filter(Boolean).length;
  // Editorial placement threshold, not an AdSense policy or publishing limit.
  return paragraphs >= 2 && words >= 100;
}

// Shared by the public renderer and editor so new reviews use the same sections.
export const reviewSections = [
  { field: "tried", id: "what-we-tried", title: "What we tried", aliases: ["What we ordered"] },
  { field: "worthKnowing", id: "before-you-go", title: "Before you go", aliases: ["Worth knowing", "One thing you should know before going"] },
  { field: "returnVerdict", id: "would-we-go-back", title: "Would we go back?", aliases: ["Our verdict", "Final verdict"] },
] as const;

export function withoutRepeatedSectionLabel(document: EditorNode, labels: readonly string[]): EditorNode {
  const first = document.content?.[0];
  if (!first) return document;
  const isLabel = first.type === "heading" || (first.type === "paragraph" && first.content?.every(
    (node) => node.type === "text" && node.marks?.some((mark) => mark.type === "bold"),
  ));
  const normalize = (text: string) => text.trim().toLowerCase().replace(/[?:.!]+$/, "");
  const text = first.content?.map((node) => node.text ?? "").join("") ?? "";
  if (!isLabel || !labels.some((label) => normalize(label) === normalize(text))) return document;
  return { ...document, content: document.content?.slice(1) };
}

export function quickVerdictPreview(value: string): { summary: string; remainder: string } {
  const text = value.trim();
  if (!text) return { summary: "", remainder: "" };
  const paragraphEnd = text.search(/\n\s*\n/);
  const firstParagraph = paragraphEnd < 0 ? text : text.slice(0, paragraphEnd);
  // A decimal price such as $4.25 is not a sentence boundary.
  const sentences = [...firstParagraph.matchAll(/[.!?](?=\s|$)/g)];
  let end = sentences.length > 1 ? sentences[1].index! + 1 : firstParagraph.length;
  if (end > 280) {
    const space = text.lastIndexOf(" ", 280);
    end = space > 0 ? space : 280;
  }
  return { summary: text.slice(0, end).trim(), remainder: text.slice(end).trim() };
}

export function reviewPlainText(content: unknown): string {
  if (!isEditorDocument(content)) throw new Error("Review contains invalid rich text.");
  const flatten = (node: EditorNode): string => [node.text ?? "", ...(node.content ?? []).map(flatten)].join(" ");
  const template = readReviewTemplate(content);
  return [
    flatten(content),
    ...(template ? [template.quickVerdict, template.priceRange, template.bestFor,
      flatten(template.tried), flatten(template.worthKnowing), flatten(template.returnVerdict)] : []),
  ].join(" ").trim();
}
