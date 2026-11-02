import Link from "next/link";
import { Suspense } from "react";
import { Activity, ArrowUpRight, Building2, FileText, Image as ImageIcon, MapPin, Plus, Users } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="cms-loading" role="status">Loading your review dashboard...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  const access = await requireAdminPage();
  if (access.state === "unconfigured") {
    return <p className="cms-alert">Supabase is not configured. Admin data is unavailable.</p>;
  }
  const { client, identity } = access;
  const [articles, drafts, inReview, published, scheduled, restaurants, visits, media] = await Promise.all([
    client.from("articles").select("id", { count: "exact", head: true }),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    client.from("restaurants").select("id", { count: "exact", head: true }),
    client.from("restaurant_visits").select("id", { count: "exact", head: true }),
    client.from("media").select("id", { count: "exact", head: true }).eq("storage_bucket", "editorial-media"),
  ]);
  for (const result of [articles, drafts, inReview, published, scheduled, restaurants, visits, media]) {
    if (result.error) throw new Error(`Could not load dashboard counts: ${result.error.message}`);
  }
  const { data: recent, error: recentError } = await client
    .from("articles")
    .select("id,title,slug,status,updated_at,category:categories(name)")
    .order("updated_at", { ascending: false })
    .limit(6);
  if (recentError) throw new Error(`Could not load recent articles: ${recentError.message}`);
  const { data: reminders, error: reminderError } = await client.from("articles")
    .select("id,title,status,featured_media_id,seo:article_seo(meta_description)")
    .neq("status", "archived").order("updated_at", { ascending: false }).limit(100);
  if (reminderError) throw new Error(`Could not load editorial reminders: ${reminderError.message}`);
  const activityQuery = identity.role === "contributor"
    ? Promise.resolve({ data: [], error: null })
    : client.from("editorial_activity").select("id,entity_id,action,details,created_at")
      .eq("entity_type", "article").order("created_at", { ascending: false }).limit(6);
  const { data: activity, error: activityError } = await activityQuery;
  if (activityError) throw new Error(`Could not load recent editorial activity: ${activityError.message}`);

  const stats = [
    { label: "Reviews", value: articles.count, hint: "All reviews you can access", icon: FileText },
    { label: "Drafts", value: drafts.count, hint: "Work in progress", icon: FileText },
    { label: "In review", value: inReview.count, hint: "Awaiting an editorial decision", icon: Activity },
    { label: "Published", value: published.count, hint: "Currently published", icon: ArrowUpRight },
    { label: "Scheduled", value: scheduled.count, hint: "Requires configured scheduler", icon: Activity },
    { label: "Places", value: restaurants.count, hint: `${visits.count ?? 0} restaurant and activity visits`, icon: Building2 },
    { label: "Media assets", value: media.count, hint: "Editorial images", icon: ImageIcon },
  ];

  return (
    <>
      <div className="cms-page-heading">
        <div><span className="cms-overline">YOUR EDITORIAL DESK</span><h1>Good to see you, {identity.displayName.split(" ")[0]}.</h1><p>Keep the reporting moving. Here is what needs attention in the workspace.</p></div>
        <div className="cms-heading-actions"><Link className="cms-primary-button" href="/admin/reviews/new"><Plus size={15} /> New review</Link></div>
      </div>
      <section className="cms-stats-grid" aria-label="Editorial overview">
        {stats.map(({ label, value, hint, icon: Icon }) => <article className="cms-stat-card" key={label}><span>{label}<Icon aria-hidden="true" size={15} /></span><strong>{value ?? 0}</strong><small>{hint}</small></article>)}
      </section>
      <div className="cms-dashboard-grid">
        <section className="cms-panel">
          <div className="cms-panel-header"><h2>Recently updated</h2><Link href="/admin/reviews">All articles <ArrowUpRight size={13} /></Link></div>
          {recent?.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>ARTICLE</th><th>STATUS</th><th>UPDATED</th></tr></thead><tbody>
            {recent.map((article) => {
              const category = Array.isArray(article.category) ? article.category[0] : article.category;
              return <tr key={article.id}><td><Link className="cms-table-title" href={`/admin/reviews/${article.id}/edit`}>{article.title || "Untitled article"}</Link><span className="cms-table-subtitle">{category?.name ?? "Uncategorized"} · /{article.slug}</span></td><td><span className="cms-status-badge" data-status={article.status}>{article.status.replace("_", " ")}</span></td><td>{new Date(article.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td></tr>;
            })}
          </tbody></table></div> : <div className="cms-empty"><strong>No articles yet</strong>Start a draft and it will appear here.</div>}
        </section>
        <section className="cms-panel"><div className="cms-panel-header"><h2>Quick actions</h2></div><div className="cms-panel-body cms-quick-actions">
          <Link href="/admin/reviews/new"><FileText size={17} /> Write a review</Link>
          <Link href="/admin/places/new"><Building2 size={17} /> Add a place</Link>
          <Link href="/admin/media"><ImageIcon size={17} /> Upload editorial media</Link>
          <Link href="/admin/neighborhoods"><MapPin size={17} /> Manage neighborhoods</Link>
        </div></section>
        <section className="cms-panel"><div className="cms-panel-header"><h2>Editorial reminders</h2><Link href="/admin/seo">Review SEO <ArrowUpRight size={13} /></Link></div>
          {(() => {
            const items = (reminders ?? []).flatMap((article) => {
              const seo = Array.isArray(article.seo) ? article.seo[0] : article.seo;
              const issues = [];
              if (article.status === "in_review") issues.push("Awaiting editorial review");
              if (!article.featured_media_id) issues.push("Missing featured image");
              if (!seo?.meta_description?.trim()) issues.push("Missing SEO description");
              return issues.map((issue) => ({ id: article.id, title: article.title || "Untitled article", issue }));
            }).slice(0, 8);
            return items.length
              ? <ul className="cms-list cms-panel-body">{items.map((item, index) => <li key={`${item.id}-${item.issue}-${index}`}><Activity aria-hidden="true" size={15} /><span><Link href={`/admin/reviews/${item.id}/edit`}><b>{item.title}</b></Link> · {item.issue}</span></li>)}</ul>
              : <div className="cms-empty">No editorial reminders in the most recently updated articles.</div>;
          })()}
        </section>
        {identity.role !== "contributor" && <section className="cms-panel"><div className="cms-panel-header"><h2>Recent article activity</h2><Users aria-hidden="true" size={15} /></div>
          {activity?.length ? <ul className="cms-list cms-panel-body">{activity.map((entry) => {
            const details = typeof entry.details === "object" && entry.details !== null ? entry.details as { title?: string } : {};
            return <li key={entry.id}><Activity aria-hidden="true" size={15} /><span>{details.title ?? "Article"} · {entry.action.replace("_", " ")}<small className="cms-table-subtitle">{new Date(entry.created_at).toLocaleString()}</small></span></li>;
          })}</ul> : <div className="cms-empty">Article changes will appear here as editors work.</div>}
        </section>}
      </div>
    </>
  );
}
