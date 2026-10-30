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
  category: { name: string } | { name: string }[] | null;
};

const statuses = ["draft", "in_review", "approved", "scheduled", "published", "archived"];

export function ArticleListTable({ articles, totalCount }: { articles: ArticleRow[]; totalCount: number }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(() => articles.filter((article) => {
    const matchesText = article.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesText && (!status || article.status === status);
  }), [articles, search, status]);
  return <section className="cms-panel">
    <div className="cms-panel-header"><h2>All articles</h2><p>Showing {articles.length} of {totalCount} most recently updated</p></div>
    <div className="cms-panel-body"><div className="cms-toolbar">
      <label><span className="cms-sr-only">Search article titles</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search article titles" value={search} /></label>
      <label><span className="cms-sr-only">Filter by status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label>
      <span className="cms-muted">{visible.length} displayed</span>
    </div></div>
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>ARTICLE</th><th>SECTION</th><th>STATUS</th><th>LAST UPDATED</th><th>ACTIONS</th></tr></thead><tbody>
      {visible.map((row) => {
        const category = Array.isArray(row.category) ? row.category[0] : row.category;
        return <tr key={row.id}><td><Link className="cms-table-title" href={`/admin/articles/${row.id}`}>{row.title || "Untitled article"}</Link><span className="cms-table-subtitle">{row.subtitle || `/${row.slug}`}</span></td><td>{category?.name ?? "Uncategorized"}</td><td><span className="cms-status-badge" data-status={row.status}>{row.status.replace("_", " ")}</span></td><td>{new Date(row.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td><FormWithFeedback action={duplicateArticle} submitLabel="Duplicate"><input name="articleId" type="hidden" value={row.id} /></FormWithFeedback></td></tr>;
      })}
      {!visible.length && <tr><td colSpan={5} className="cms-empty">No articles match. Create a draft or adjust the filters.</td></tr>}
    </tbody></table></div>
  </section>;
}
