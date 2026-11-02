"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { duplicateArticle } from "@/app/actions/articles";
import { FormWithFeedback } from "@/components/admin/form-feedback";

type ArticleRow = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  status: string;
  updated_at: string;
  published_at: string | null;
  category: { name: string } | { name: string }[] | null;
  author: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null;
};

const statuses = ["draft", "in_review", "approved", "scheduled", "published", "archived"];

export function ArticleListTable({ articles, totalCount }: { articles: ArticleRow[]; totalCount: number }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const categories = useMemo(() => Array.from(new Map(articles.flatMap((article) => {
    const category = Array.isArray(article.category) ? article.category[0] : article.category;
    return category?.name ? [[category.name, category.name] as const] : [];
  })).keys()).sort(), [articles]);
  const authors = useMemo(() => Array.from(new Set(articles.flatMap((article) => {
    const author = Array.isArray(article.author) ? article.author[0] : article.author;
    return author ? [author.display_name || author.email] : [];
  }))).sort(), [articles]);
  const visible = useMemo(() => articles.filter((article) => {
    const matchesText = article.title.toLowerCase().includes(search.trim().toLowerCase());
    const category = Array.isArray(article.category) ? article.category[0] : article.category;
    const author = Array.isArray(article.author) ? article.author[0] : article.author;
    const authorName = author ? author.display_name || author.email : "";
    return matchesText && (!status || article.status === status) &&
      (!categoryFilter || category?.name === categoryFilter) &&
      (!authorFilter || authorName === authorFilter);
  }).sort((a, b) => sortBy === "published"
    ? new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
    : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [articles, search, status, categoryFilter, authorFilter, sortBy]);
  return <section className="cms-panel">
    <div className="cms-panel-header"><h2>All reviews</h2><p>Showing {articles.length} of {totalCount} most recently updated</p></div>
    <div className="cms-panel-body"><div className="cms-toolbar">
      <label><span className="cms-sr-only">Search review titles</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search review titles" value={search} /></label>
      <label><span className="cms-sr-only">Filter by status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label>
      <label><span className="cms-sr-only">Filter by review type</span><select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="">All review types</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span className="cms-sr-only">Filter by author</span><select onChange={(event) => setAuthorFilter(event.target.value)} value={authorFilter}><option value="">All authors</option>{authors.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span className="cms-sr-only">Sort articles</span><select onChange={(event) => setSortBy(event.target.value)} value={sortBy}><option value="updated">Recently updated</option><option value="published">Publication date</option></select></label>
      <span className="cms-muted">{visible.length} displayed</span>
    </div></div>
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>ARTICLE</th><th>SECTION</th><th>AUTHOR</th><th>STATUS</th><th>PUBLICATION DATE</th><th>ACTIONS</th></tr></thead><tbody>
      {visible.map((row) => {
        const category = Array.isArray(row.category) ? row.category[0] : row.category;
        const author = Array.isArray(row.author) ? row.author[0] : row.author;
        return <tr key={row.id}><td><Link className="cms-table-title" href={`/admin/reviews/${row.id}/edit`}>{row.title || "Untitled article"}</Link><span className="cms-table-subtitle">{row.subtitle || `/${row.slug}`}</span></td><td>{category?.name ?? "Uncategorized"}</td><td>{author?.display_name || author?.email || "—"}</td><td><span className="cms-status-badge" data-status={row.status}>{row.status.replace("_", " ")}</span></td><td>{row.published_at ? new Date(row.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td><td><FormWithFeedback action={duplicateArticle} submitLabel="Duplicate"><input name="articleId" type="hidden" value={row.id} /></FormWithFeedback></td></tr>;
      })}
      {!visible.length && <tr><td colSpan={6} className="cms-empty">No articles match. Create a draft or adjust the filters.</td></tr>}
    </tbody></table></div>
  </section>;
}
