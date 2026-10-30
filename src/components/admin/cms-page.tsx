import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, CircleCheck, Plus } from "lucide-react";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { requireAdminPage } from "@/lib/admin-auth";
import { deleteMedia, updateMediaMetadata } from "@/app/actions/media";
import { saveRestaurant } from "@/app/actions/restaurants";
import { saveRestaurantVisit } from "@/app/actions/visits";
import { saveNeighborhood } from "@/app/actions/neighborhoods";
import { inviteTeamMember, updateTeamRole } from "@/app/actions/team";
import { DeleteRestaurantButton } from "@/components/admin/destructive-action";
import { ArticleListTable } from "@/components/admin/article-list-table";
import { FormWithFeedback } from "@/components/admin/form-feedback";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { ReceiptUploadForm } from "@/components/admin/receipt-upload-form";

type Section = "articles" | "restaurants" | "visits" | "media" | "neighborhoods" | "seo" | "analytics" | "team" | "settings";

const heading: Record<Section, { title: string; description: string }> = {
  articles: { title: "Articles", description: "Draft, review, and publish the stories that make Las Vegas worth knowing." },
  restaurants: { title: "Restaurants", description: "Keep verified restaurant details and reporting notes together." },
  visits: { title: "Restaurant visits", description: "Record firsthand visit details and keep receipts private." },
  media: { title: "Media library", description: "Manage editorial images, alt text, captions, and credits." },
  neighborhoods: { title: "Neighborhoods", description: "Maintain the local context used by guides and reviews." },
  seo: { title: "SEO audit", description: "Review concrete metadata and indexing issues before publication." },
  analytics: { title: "Analytics", description: "Reporting integrations are intentionally shown as unavailable until wired." },
  team: { title: "Team", description: "Manage invited editorial accounts and their CMS roles." },
  settings: { title: "Settings", description: "Check publication identity, integrations, and publishing configuration." },
};

type RecordData = Record<string, string | number | boolean | null | undefined>;

export async function CmsPage({ section, recordId }: { section: Section; recordId?: string }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const title = heading[section];
  return (
    <>
      <div className="cms-page-heading">
        <div><span className="cms-overline">EDITORIAL WORKSPACE</span><h1>{recordId ? `Edit ${section === "visits" ? "visit" : "restaurant"}` : title.title}</h1><p>{title.description}</p></div>
        <div className="cms-heading-actions">{section === "articles" && <Link className="cms-primary-button" href="/admin/articles/new"><Plus size={15} /> New article</Link>}{section === "restaurants" && !recordId && <Link className="cms-primary-button" href="/admin/restaurants/new"><Plus size={15} /> Add restaurant</Link>}{section === "visits" && !recordId && <Link className="cms-primary-button" href="/admin/visits/new"><Plus size={15} /> Record a visit</Link>}</div>
      </div>
      {section === "articles" && <ArticleList />}
      {section === "restaurants" && <RestaurantSection recordId={recordId} />}
      {section === "visits" && <VisitSection recordId={recordId} />}
      {section === "media" && <MediaSection />}
      {section === "neighborhoods" && <NeighborhoodSection />}
      {section === "seo" && <SeoAudit />}
      {section === "analytics" && <AnalyticsStatus />}
      {section === "team" && <TeamStatus />}
      {section === "settings" && <SettingsStatus />}
    </>
  );
}

async function ArticleList() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const { data, error, count } = await access.client.from("articles")
    .select("id,title,subtitle,slug,status,updated_at,category:categories(name)", { count: "exact" })
    .order("updated_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Could not load articles: ${error.message}`);
  return <ArticleListTable articles={data ?? []} totalCount={count ?? 0} />;
}

async function RestaurantSection({ recordId }: { recordId?: string }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Restaurant records are available to editors and owners.</p>;
  const [restaurants, neighborhoods] = await Promise.all([
    access.client.from("restaurants").select("id,name,slug,cuisine,neighborhood_id,visit_status,updated_at").order("name"),
    access.client.from("neighborhoods").select("id,name").order("name"),
  ]);
  if (restaurants.error) throw new Error(`Could not load restaurants: ${restaurants.error.message}`);
  if (neighborhoods.error) throw new Error(`Could not load neighborhoods: ${neighborhoods.error.message}`);
  const restaurant = recordId ? await access.client.from("restaurants").select("*").eq("id", recordId).maybeSingle() : null;
  if (restaurant?.error) throw new Error(`Could not load restaurant: ${restaurant.error.message}`);
  if (recordId && !restaurant?.data) return <p className="cms-alert">Restaurant not found.</p>;
  if (recordId || restaurants.data?.length === 0) {
    const data = (restaurant?.data ?? {}) as RecordData;
    return <section className="cms-panel"><div className="cms-panel-header"><h2>{recordId ? "Restaurant details" : "Add a restaurant"}</h2></div><div className="cms-panel-body">
      <FormWithFeedback action={saveRestaurant} className="cms-form-grid">
        {recordId && <input name="id" type="hidden" value={String(data.id)} />}
        <Field label="Name" name="name" required defaultValue={String(data.name ?? "")} />
        <Field label="URL slug" name="slug" required defaultValue={String(data.slug ?? "")} help="Lowercase words separated by hyphens." />
        <Field label="Cuisine" name="cuisine" defaultValue={String(data.cuisine ?? "")} />
        <label className="cms-field"><span className="cms-label">Neighborhood</span><select name="neighborhoodId" defaultValue={String(data.neighborhood_id ?? "")}><option value="">Not assigned</option>{neighborhoods.data?.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
        <Field label="Address" name="address" defaultValue={String(data.address ?? "")} />
        <Field label="City" name="city" defaultValue={String(data.city ?? "Las Vegas")} />
        <Field label="State" name="state" defaultValue={String(data.state ?? "NV")} />
        <Field label="Postal code" name="postalCode" defaultValue={String(data.postal_code ?? "")} />
        <Field label="Website (HTTPS)" name="website" type="url" defaultValue={String(data.website ?? "")} />
        <Field label="Phone" name="phone" defaultValue={String(data.phone ?? "")} />
        <label className="cms-field"><span className="cms-label">Price range</span><select name="priceRange" defaultValue={String(data.price_range ?? "")}><option value="">Not set</option>{["$", "$$", "$$$", "$$$$"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <Field label="Description" name="description" multiline className="cms-form-span" defaultValue={String(data.description ?? "")} />
        <Field label="Parking information" name="parkingInformation" multiline defaultValue={String(data.parking_information ?? "")} />
        <Field label="Reservation information" name="reservationInformation" multiline defaultValue={String(data.reservation_information ?? "")} />
        <Field label="Internal notes (not public)" name="internalNotes" multiline className="cms-form-span" defaultValue={String(data.internal_notes ?? "")} />
        {recordId && <div className="cms-form-span"><DeleteRestaurantButton id={recordId} /></div>}
      </FormWithFeedback>
    </div></section>;
  }
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Restaurant directory</h2><p>{restaurants.data?.length ?? 0} records</p></div>
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>RESTAURANT</th><th>CUISINE</th><th>VISIT STATUS</th><th>LAST UPDATED</th></tr></thead><tbody>
      {restaurants.data?.map((row) => <tr key={row.id}><td><Link className="cms-table-title" href={`/admin/restaurants/${row.id}/edit`}>{row.name}</Link><span className="cms-table-subtitle">/{row.slug}</span></td><td>{row.cuisine || "—"}</td><td>{row.visit_status.replace("_", " ")}</td><td>{new Date(row.updated_at).toLocaleDateString()}</td></tr>)}
      {!restaurants.data?.length && <tr><td colSpan={4} className="cms-empty">No restaurants yet. Add the first verified listing.</td></tr>}
    </tbody></table></div>
  </section>;
}

async function VisitSection({ recordId }: { recordId?: string }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Restaurant visits and receipts are private to editors and owners.</p>;
  const [restaurantResult, visitResult, articleResult] = await Promise.all([
    access.client.from("restaurants").select("id,name").order("name"),
    recordId
      ? access.client.from("restaurant_visits").select("*").eq("id", recordId).maybeSingle()
      : access.client.from("restaurant_visits").select("id,visited_at,party_size,final_total,restaurant:restaurants(name)").order("visited_at", { ascending: false }).limit(100),
    access.client.from("articles").select("id,title").order("updated_at", { ascending: false }).limit(100),
  ]);
  if (restaurantResult.error) throw new Error(`Could not load restaurants: ${restaurantResult.error.message}`);
  if (visitResult.error) throw new Error(`Could not load visits: ${visitResult.error.message}`);
  if (articleResult.error) throw new Error(`Could not load articles: ${articleResult.error.message}`);
  if (recordId && !visitResult.data) return <p className="cms-alert">Visit not found.</p>;
  if (recordId || visitResult.data?.length === 0) {
    const data = (recordId ? visitResult.data : {}) as RecordData;
    let privateReceiptUrl: string | undefined;
    if (recordId && typeof data.receipt_storage_path === "string") {
      const { data: signedReceipt, error: signedError } = await access.client.storage
        .from("private-receipts").createSignedUrl(data.receipt_storage_path, 300);
      if (signedError) throw new Error(`Could not create a private receipt link: ${signedError.message}`);
      privateReceiptUrl = signedReceipt.signedUrl;
    }
    return <>
    <section className="cms-panel"><div className="cms-panel-header"><h2>{recordId ? "Visit details" : "Record a visit"}</h2></div><div className="cms-panel-body">
      {restaurantResult.data?.length ? <FormWithFeedback action={saveRestaurantVisit} className="cms-form-grid">
        {recordId && <input name="id" type="hidden" value={String(data.id)} />}
        <label className="cms-field"><span className="cms-label">Restaurant</span><select name="restaurantId" required defaultValue={String(data.restaurant_id ?? "")}><option value="">Select a restaurant</option>{restaurantResult.data.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <Field label="Visit date" name="visitedAt" type="date" required defaultValue={String(data.visited_at ?? new Date().toISOString().slice(0, 10))} />
        <Field label="Party size" name="partySize" type="number" required defaultValue={String(data.party_size ?? 2)} />
        <Field label="Food subtotal (USD)" name="foodSubtotal" type="number" defaultValue={String(data.food_subtotal ?? 0)} />
        <Field label="Drinks subtotal (USD)" name="drinksSubtotal" type="number" defaultValue={String(data.drinks_subtotal ?? 0)} />
        <Field label="Additional charges (USD)" name="additionalCharges" type="number" defaultValue={String(data.additional_charges ?? 0)} />
        <Field label="Sales tax (USD)" name="salesTax" type="number" defaultValue={String(data.sales_tax ?? 0)} />
        <Field label="Tip (USD)" name="tip" type="number" defaultValue={String(data.tip ?? 0)} />
        <Field label="Manual total override (optional)" name="manualTotalOverride" type="number" defaultValue={String(data.manual_total_override ?? "")} />
        <label className="cms-field"><span className="cms-label">Would you return?</span><select name="wouldReturn" defaultValue={data.would_return === true ? "yes" : data.would_return === false ? "no" : ""}><option value="">Not assessed</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label className="cms-field"><span className="cms-label">Related article</span><select name="articleId" defaultValue={String(data.article_id ?? "")}><option value="">None</option>{articleResult.data?.map((a) => <option key={a.id} value={a.id}>{a.title || "Untitled"}</option>)}</select></label>
        <Field label="Experience notes (internal)" name="experienceNotes" multiline className="cms-form-span" defaultValue={String(data.experience_notes ?? "")} />
        <Field label="Editorial verdict" name="editorialVerdict" multiline className="cms-form-span" defaultValue={String(data.editorial_verdict ?? "")} />
        <div className="cms-form-span"><p className="cms-muted">{data.receipt_storage_path ? "Receipt attachments are managed below." : "No receipts are attached yet."} Do not enter payment-card or other sensitive personal details in notes.</p></div>
      </FormWithFeedback> : <div className="cms-empty"><strong>Add a restaurant first</strong><Link href="/admin/restaurants/new">Create a restaurant record</Link></div>}
    </div></section>
    {recordId && (access.identity.role === "owner" || access.identity.role === "editor") && <ReceiptUploadForm visitId={recordId} privateReceiptUrl={privateReceiptUrl} />}
    </>;
  }
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Visit log</h2><p>Totals are private and are not displayed publicly.</p></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>RESTAURANT</th><th>VISIT DATE</th><th>PARTY</th><th>FINAL TOTAL</th></tr></thead><tbody>
    {visitResult.data?.map((visit: { id: string; visited_at: string; party_size: number; final_total: number; restaurant: { name: string } | { name: string }[] | null }) => {
      const restaurant = Array.isArray(visit.restaurant) ? visit.restaurant[0] : visit.restaurant;
      return <tr key={visit.id}><td><Link className="cms-table-title" href={`/admin/visits/${visit.id}/edit`}>{restaurant?.name ?? "Restaurant"}</Link></td><td>{new Date(`${visit.visited_at}T12:00:00`).toLocaleDateString()}</td><td>{visit.party_size}</td><td>${Number(visit.final_total).toFixed(2)}</td></tr>;
    })}
    {!visitResult.data?.length && <tr><td colSpan={4} className="cms-empty">No recorded visits.</td></tr>}
  </tbody></table></div></section>;
}

async function MediaSection() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const { data, error } = await access.client.from("media").select("id,file_name,mime_type,file_size,alt_text,caption,photographer_credit,storage_bucket,storage_path,created_at").eq("storage_bucket", "editorial-media").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Could not load media library: ${error.message}`);
  const env = getSupabaseEnvironment();
  const publicMediaUrl = (path: string) => env ? `${env.url}/storage/v1/object/public/editorial-media/${path.split("/").map(encodeURIComponent).join("/")}` : "";
  return <>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Upload editorial image</h2><p>JPEG, PNG, WebP, or AVIF · 15 MB maximum</p></div><div className="cms-panel-body">
      <MediaUploadForm />
    </div></section>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Editorial images</h2><p>{data?.length ?? 0} recent uploads</p></div>
      {data?.length ? <div className="cms-media-grid">{data.map((media) => <article className="cms-media-card" key={media.id}>
        {/* The public bucket URL points at editorial images only, never receipts. */}
        <Image alt={media.alt_text || ""} height={300} src={publicMediaUrl(media.storage_path)} unoptimized width={400} />
        <FormWithFeedback action={updateMediaMetadata} className="cms-panel-body cms-media-form">
          <input name="id" type="hidden" value={media.id} />
          <label className="cms-field"><span className="cms-label">Alt text</span><input defaultValue={media.alt_text} name="altText" /></label>
          <label className="cms-field"><span className="cms-label">Caption</span><textarea defaultValue={media.caption} name="caption" /></label>
          <label className="cms-field"><span className="cms-label">Credit</span><input defaultValue={media.photographer_credit} name="photographerCredit" /></label>
          <p className="cms-muted">{media.file_name} · {(media.file_size / 1024 / 1024).toFixed(1)} MB</p>
        </FormWithFeedback>
        <FormWithFeedback action={deleteMedia} submitLabel="Delete image"><input name="id" type="hidden" value={media.id} /></FormWithFeedback>
      </article>)}</div> : <div className="cms-empty"><strong>Your library is empty</strong>Upload owned or properly licensed imagery with accurate alt text.</div>}
    </section>
  </>;
}

async function NeighborhoodSection() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Neighborhood management is available to editors and owners.</p>;
  const { data, error } = await access.client.from("neighborhoods").select("id,name,slug,description,seo_title,meta_description,updated_at").order("name");
  if (error) throw new Error(`Could not load neighborhoods: ${error.message}`);
  return <>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Add neighborhood</h2></div><div className="cms-panel-body">
      <FormWithFeedback action={saveNeighborhood} className="cms-form-grid">
        <Field label="Name" name="name" required defaultValue="" />
        <Field label="Slug" name="slug" required defaultValue="" />
        <Field label="SEO title" name="seoTitle" defaultValue="" />
        <Field label="Meta description" name="metaDescription" defaultValue="" />
        <Field label="Local description" name="description" multiline className="cms-form-span" defaultValue="" />
      </FormWithFeedback>
    </div></section>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Las Vegas neighborhoods</h2><p>{data?.length ?? 0} curated records</p></div>
      <div className="cms-panel-body cms-neighborhood-grid">{data?.map((item) => <FormWithFeedback action={saveNeighborhood} className="cms-neighborhood-card" key={item.id}>
        <input name="id" type="hidden" value={item.id} />
        <Field label="Name" name="name" required defaultValue={item.name} />
        <Field label="Slug" name="slug" required defaultValue={item.slug} />
        <Field label="SEO title" name="seoTitle" defaultValue={item.seo_title ?? ""} />
        <Field label="Meta description" name="metaDescription" defaultValue={item.meta_description ?? ""} />
        <Field label="Local description" name="description" multiline defaultValue={item.description} />
      </FormWithFeedback>)}</div>
      {!data?.length && <div className="cms-empty">No neighborhoods configured.</div>}
    </section>
  </>;
}

async function SeoAudit() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const { data, error } = await access.client.from("articles").select("id,title,slug,status,is_indexable,seo:article_seo(seo_title,meta_description,canonical_url,indexing_enabled)").order("updated_at", { ascending: false }).limit(500);
  if (error) throw new Error(`Could not run article SEO audit: ${error.message}`);
  const issues = (data ?? []).flatMap((article) => {
    const seo = Array.isArray(article.seo) ? article.seo[0] : article.seo;
    const checks: string[] = [];
    if (article.status === "published" && !article.is_indexable) checks.push("Published article is marked noindex");
    if (article.status === "published" && !seo?.indexing_enabled) checks.push("SEO indexing is disabled");
    if (!seo?.seo_title?.trim()) checks.push("SEO title is empty");
    else if (seo.seo_title.length > 60) checks.push(`SEO title is ${seo.seo_title.length} characters (over 60)`);
    if (!seo?.meta_description?.trim()) checks.push("Meta description is empty");
    else if (seo.meta_description.length > 160) checks.push(`Meta description is ${seo.meta_description.length} characters (over 160)`);
    if (seo?.canonical_url && !seo.canonical_url.startsWith("https://")) checks.push("Canonical URL does not use HTTPS");
    return checks.map((message) => ({ id: article.id, title: article.title || "Untitled article", status: article.status, message }));
  });
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Article metadata checks</h2><p>{issues.length} items to review</p></div>
    {issues.length ? <ul className="cms-list">{issues.map((issue, index) => <li key={`${issue.id}-${issue.message}-${index}`}><AlertTriangle aria-hidden="true" size={15} /><span><Link href={`/admin/articles/${issue.id}`}><b>{issue.title}</b></Link> · {issue.message}<small className="cms-table-subtitle">{issue.status}</small></span></li>)}</ul> : <div className="cms-empty"><strong>No issues found in the latest 500 articles</strong>The audit only checks configured CMS metadata; it is not an external crawler.</div>}
  </section>;
}

async function AnalyticsStatus() {
  const gaConfigured = Boolean(process.env.GA4_PROPERTY_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  const searchConsoleConfigured = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Reporting connections</h2></div><ul className="cms-list cms-panel-body">
    <li>{gaConfigured ? <CircleCheck size={15} /> : <AlertTriangle size={15} />}<span><b>Google Analytics 4</b> — {gaConfigured ? "Credentials detected; the reporting connector is not implemented, so no metrics are shown." : "Not configured. Analytics reporting is not connected."}</span></li>
    <li>{searchConsoleConfigured ? <CircleCheck size={15} /> : <AlertTriangle size={15} />}<span><b>Google Search Console</b> — {searchConsoleConfigured ? "Credentials detected; the reporting connector is not implemented, so no metrics are shown." : "Not configured. Search performance reporting is not connected."}</span></li>
  </ul><div className="cms-panel-body"><p className="cms-muted">No analytics scripts, cookies, or fabricated metrics are included on the public site.</p></div></section>;
}

async function TeamStatus() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const { data, error } = await access.client.from("profiles").select("id,email,display_name,role,created_at").order("created_at");
  if (error) throw new Error(`Could not load team members: ${error.message}`);
  const adminConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <><section className="cms-panel"><div className="cms-panel-header"><h2>Editorial team</h2><p>{data?.length ?? 0} active profiles</p></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>MEMBER</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th></tr></thead><tbody>
    {data?.map((member) => <tr key={member.id}><td>{member.display_name || "—"}</td><td>{member.email}</td><td>{access.identity.role === "owner" && member.role !== "owner" ? <FormWithFeedback action={updateTeamRole} className="cms-inline-role-form"><input name="userId" type="hidden" value={member.id} /><select aria-label={`Role for ${member.email}`} defaultValue={member.role} name="role"><option value="contributor">Contributor</option><option value="editor">Editor</option></select></FormWithFeedback> : <span className="cms-status-badge">{member.role}</span>}</td><td>{new Date(member.created_at).toLocaleDateString()}</td></tr>)}
  </tbody></table></div></section>
  <section className="cms-panel"><div className="cms-panel-header"><h2>Invite a teammate</h2></div><div className="cms-panel-body">{access.identity.role !== "owner" ? <p className="cms-alert">Only an owner can invite team members.</p> : adminConfigured ? <FormWithFeedback action={inviteTeamMember} className="cms-form-grid">
    <Field label="Name" name="displayName" required defaultValue="" />
    <Field label="Email" name="email" required type="email" defaultValue="" />
    <label className="cms-field"><span className="cms-label">Role</span><select name="role" defaultValue="contributor"><option value="contributor">Contributor</option><option value="editor">Editor</option></select></label>
  </FormWithFeedback> : <p className="cms-alert">Invitations require a server-only <code>SUPABASE_SERVICE_ROLE_KEY</code>. Add it only to secure deployment secrets; no key is currently configured.</p>}</div></section></>;
}

async function SettingsStatus() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const env = getSupabaseEnvironment();
  const rows = [
    ["CMS database", env ? "Connected configuration detected" : "Not configured"],
    ["Current account", `${access.identity.email} · ${access.identity.role}`],
    ["Scheduled publishing", "Manual — no scheduler has been configured"],
    ["Analytics", "Not connected"],
    ["Public site", "https://vegasunfiltered.com"],
  ];
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Publication settings</h2></div><dl className="cms-settings-list">{rows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><div className="cms-panel-body"><p className="cms-muted">This CMS has no user-editable settings yet. Environment and database configuration are documented in the project README.</p></div></section>;
}

function Field({ label, name, defaultValue, type = "text", required = false, multiline = false, help, className = "" }: { label: string; name: string; defaultValue: string; type?: string; required?: boolean; multiline?: boolean; help?: string; className?: string }) {
  return <label className={`cms-field ${className}`}><span className="cms-label">{label}</span>{multiline ? <textarea defaultValue={defaultValue} name={name} required={required} /> : <input defaultValue={defaultValue} name={name} required={required} type={type} />}{help && <small>{help}</small>}</label>;
}
