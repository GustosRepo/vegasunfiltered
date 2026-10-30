import type { ReactNode } from "react";
import Image from "next/image";
import { getYoutubeEmbedUrl, isEditorDocument, type EditorNode } from "@/lib/cms-schemas";

function renderText(node: EditorNode, key: string): ReactNode {
  let value: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") value = <strong key={`${key}-bold`}>{value}</strong>;
    if (mark.type === "italic") value = <em key={`${key}-italic`}>{value}</em>;
    if (mark.type === "strike") value = <s key={`${key}-strike`}>{value}</s>;
    if (mark.type === "code") value = <code key={`${key}-code`}>{value}</code>;
    if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      value = <a href={mark.attrs.href} key={`${key}-link`} rel="noopener noreferrer">{value}</a>;
    }
  }
  return value;
}

function renderNode(node: EditorNode, key: string): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`));
  if (node.type === "text") return renderText(node, key);
  if (node.type === "doc") return <>{children}</>;
  if (node.type === "paragraph") return <p key={key}>{children}</p>;
  if (node.type === "heading") {
    const level = Number(node.attrs?.level);
    if (level === 2) return <h2 key={key}>{children}</h2>;
    if (level === 3) return <h3 key={key}>{children}</h3>;
    return <h4 key={key}>{children}</h4>;
  }
  if (node.type === "bulletList") return <ul key={key}>{children}</ul>;
  if (node.type === "orderedList") return <ol key={key}>{children}</ol>;
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  if (node.type === "blockquote") return <blockquote key={key}>{children}</blockquote>;
  if (node.type === "codeBlock") return <pre key={key}><code>{children}</code></pre>;
  if (node.type === "horizontalRule") return <hr key={key} />;
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type === "image" && typeof node.attrs?.src === "string") {
    return <figure className="cms-body-image" key={key}><Image alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""} height={800} src={node.attrs.src} unoptimized width={1200} />{typeof node.attrs.title === "string" && <figcaption>{node.attrs.title}</figcaption>}</figure>;
  }
  if (node.type === "youtube" && typeof node.attrs?.src === "string") {
    const embedUrl = getYoutubeEmbedUrl(node.attrs.src);
    if (!embedUrl) return null;
    return <figure className="cms-body-video" key={key}><iframe allow="encrypted-media; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" src={embedUrl} title="Embedded YouTube video" /></figure>;
  }
  if (node.type === "table") return <div className="cms-body-table-wrap" key={key}><table><tbody>{children}</tbody></table></div>;
  if (node.type === "tableRow") return <tr key={key}>{children}</tr>;
  if (node.type === "tableHeader") return <th key={key}>{children}</th>;
  if (node.type === "tableCell") return <td key={key}>{children}</td>;
  return null;
}

export function CmsArticleBody({ content }: { content: unknown }) {
  if (!isEditorDocument(content)) {
    throw new Error("Published CMS article contains invalid rich text.");
  }
  return <div className="cms-published-body">{renderNode(content, "article")}</div>;
}
