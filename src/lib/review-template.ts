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
