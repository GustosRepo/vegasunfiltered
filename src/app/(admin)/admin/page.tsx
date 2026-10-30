import Link from "next/link";
import { Activity, ArrowUpRight, Building2, FileText, Image as ImageIcon, MapPin, Plus } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function AdminHome() {
  const access = await requireAdminPage();
  if (access.state === "unconfigured") {
    return <p className="cms-alert">Supabase is not configured. Admin data is unavailable.</p>;
  }
  const { client, identity } = access;
  const [articles, inReview, published, restaurants, visits] = await Promise.all([
    client.from("articles").select("id", { count: "exact", head: true }),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    client.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    client.from("restaurants").select("id", { count: "exact", head: true }),
    client.from("restaurant_visits").select("id", { count: "exact", head: true }),
  ]);
  for (const result of [articles, inReview, published, restaurants, visits]) {
    if (result.error) throw new Error(`Could not load dashboard counts: ${result.error.message}`);
  }
  const { data: recent, error: recentError } = await client
    .from("articles")
    .select("id,title,slug,status,updated_at,category:categories(name)")
    .order("updated_at", { ascending: false })
    .limit(6);
  if (recentError) throw new Error(`Could not load recent articles: ${recentError.message}`);

  const stats = [
    { label: "Articles", value: articles.count, hint: "All articles you can access", icon: FileText },
    { label: "In review", value: inReview.count, hint: "Awaiting an editorial decision", icon: Activity },
    { label: "Published", value: published.count, hint: "Currently published", icon: ArrowUpRight },
    { label: "Restaurants", value: restaurants.count, hint: `${visits.count ?? 0} recorded visits`, icon: Building2 },
  ];

  return (
    <>
      <div className="cms-page-heading">
        <div><span className="cms-overline">YOUR EDITORIAL DESK</span><h1>Good to see you, {identity.displayName.split(" ")[0]}.</h1><p>Keep the reporting moving. Here is what needs attention in the workspace.</p></div>
        <div className="cms-heading-actions"><Link className="cms-primary-button" href="/admin/articles/new"><Plus size={15} /> New article</Link></div>
      </div>
      <section className="cms-stats-grid" aria-label="Editorial overview">
        {stats.map(({ label, value, hint, icon: Icon }) => <article className="cms-stat-card" key={label}><span>{label}<Icon aria-hidden="true" size={15} /></span><strong>{value ?? 0}</strong><small>{hint}</small></article>)}
      </section>
      <div className="cms-dashboard-grid">
        <section className="cms-panel">
          <div className="cms-panel-header"><h2>Recently updated</h2><Link href="/admin/articles">All articles <ArrowUpRight size={13} /></Link></div>
          {recent?.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>ARTICLE</th><th>STATUS</th><th>UPDATED</th></tr></thead><tbody>
            {recent.map((article) => {
              const category = Array.isArray(article.category) ? article.category[0] : article.category;
              return <tr key={article.id}><td><Link className="cms-table-title" href={`/admin/articles/${article.id}`}>{article.title || "Untitled article"}</Link><span className="cms-table-subtitle">{category?.name ?? "Uncategorized"} · /{article.slug}</span></td><td><span className="cms-status-badge" data-status={article.status}>{article.status.replace("_", " ")}</span></td><td>{new Date(article.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td></tr>;
            })}
          </tbody></table></div> : <div className="cms-empty"><strong>No articles yet</strong>Start a draft and it will appear here.</div>}
        </section>
        <section className="cms-panel"><div className="cms-panel-header"><h2>Quick actions</h2></div><div className="cms-panel-body cms-quick-actions">
          <Link href="/admin/articles/new"><FileText size={17} /> Write an article</Link>
          <Link href="/admin/restaurants/new"><Building2 size={17} /> Add a restaurant</Link>
          <Link href="/admin/media"><ImageIcon size={17} /> Upload editorial media</Link>
          <Link href="/admin/neighborhoods"><MapPin size={17} /> Manage neighborhoods</Link>
        </div></section>
      </div>
    </>
  );
}
