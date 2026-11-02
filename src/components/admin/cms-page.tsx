import Link from "next/link";
import { AlertTriangle, CircleCheck, Plus } from "lucide-react";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { requireAdminPage } from "@/lib/admin-auth";
import { saveRestaurant } from "@/app/actions/restaurants";
import { saveRestaurantVisit } from "@/app/actions/visits";
import { saveNeighborhood } from "@/app/actions/neighborhoods";
import { inviteTeamMember, updateTeamRole } from "@/app/actions/team";
import { DeleteRestaurantButton } from "@/components/admin/destructive-action";
import { ArticleListTable } from "@/components/admin/article-list-table";
import { FormWithFeedback } from "@/components/admin/form-feedback";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { MediaLibrary } from "@/components/admin/media-library";
import { ReceiptUploadForm } from "@/components/admin/receipt-upload-form";
import { RestaurantDirectory } from "@/components/admin/restaurant-directory";
import { saveAffiliateLink, setAffiliateLinkActive } from "@/app/actions/affiliate-links";
import { reviewSection } from "@/lib/content";
import { reviewPlainText } from "@/lib/review-template";

type Section = "articles" | "restaurants" | "visits" | "media" | "neighborhoods" | "seo" | "analytics" | "team" | "settings" | "affiliates";

const heading: Record<Section, { title: string; description: string }> = {
  articles: { title: "Reviews", description: "Your restaurant and activity experiences, stories, and scores in one review." },
  restaurants: { title: "Places", description: "Reusable restaurant and activity facts. These records support reviews, not a separate public directory." },
  visits: { title: "Visits", description: "Record restaurant or activity visits, actual costs, and private receipts." },
  media: { title: "Media library", description: "Manage editorial images, alt text, captions, and credits." },
  neighborhoods: { title: "Neighborhoods", description: "Maintain the local context used by guides and reviews." },
  seo: { title: "SEO audit", description: "Review concrete metadata and indexing issues before publication." },
  analytics: { title: "Analytics", description: "Reporting integrations are intentionally shown as unavailable until wired." },
  team: { title: "Team", description: "Manage invited editorial accounts and their CMS roles." },
  settings: { title: "Settings", description: "Check publication identity, integrations, and publishing configuration." },
  affiliates: { title: "Affiliate links", description: "Manage disclosed partner links associated with published stories." },
};

type RecordData = Record<string, string | number | boolean | null | undefined>;

export async function CmsPage({ section, recordId, isNew, initialReviewId }: { section: Section; recordId?: string; isNew?: boolean; initialReviewId?: string }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const title = heading[section];
  return (
    <>
      <div className="cms-page-heading">
        <div><span className="cms-overline">EDITORIAL WORKSPACE</span><h1>{recordId ? `Edit ${section === "visits" ? "visit" : "place"}` : title.title}</h1><p>{title.description}</p></div>
        <div className="cms-heading-actions">{section === "articles" && <Link className="cms-primary-button" href="/admin/reviews/new"><Plus size={15} /> New review</Link>}{section === "restaurants" && !recordId && <Link className="cms-primary-button" href="/admin/places/new"><Plus size={15} /> Add place</Link>}{section === "visits" && !recordId && <Link className="cms-primary-button" href="/admin/visits/new"><Plus size={15} /> Record a visit</Link>}</div>
      </div>
      {section === "articles" && <ArticleList />}
      {section === "restaurants" && <RestaurantSection recordId={recordId} isNew={isNew} />}
      {section === "visits" && <VisitSection recordId={recordId} isNew={isNew} initialReviewId={initialReviewId} />}
      {section === "media" && <MediaSection />}
      {section === "neighborhoods" && <NeighborhoodSection />}
      {section === "seo" && <SeoAudit />}
      {section === "analytics" && <AnalyticsStatus />}
      {section === "team" && <TeamStatus />}
      {section === "settings" && <SettingsStatus />}
      {section === "affiliates" && <AffiliateLinksSection />}
    </>
  );
}

async function ArticleList() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  const { data, error, count } = await access.client.from("articles")
    .select("id,title,subtitle,slug,status,review_type,updated_at,published_at,author:profiles(display_name,email)", { count: "exact" })
    .order("updated_at", { ascending: false }).limit(500);
  if (error) throw new Error(`Could not load articles: ${error.message}`);
  return <ArticleListTable articles={(data ?? []).map((review) => ({ ...review, category: { name: review.review_type === "activity" ? "Activities" : "Restaurants" } }))} totalCount={count ?? 0} />;
}

async function RestaurantSection({ recordId, isNew }: { recordId?: string; isNew?: boolean }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Place records are available to editors and owners.</p>;
  const [restaurants, neighborhoods, media] = await Promise.all([
    access.client.from("restaurants").select("id,name,slug,place_type,cuisine,neighborhood_id,visit_status,updated_at").order("name"),
    access.client.from("neighborhoods").select("id,name").order("name"),
    access.client.from("media").select("id,alt_text").eq("storage_bucket", "editorial-media").eq("is_public", true).order("created_at", { ascending: false }).limit(200),
  ]);
  if (restaurants.error) throw new Error(`Could not load restaurants: ${restaurants.error.message}`);
  if (neighborhoods.error) throw new Error(`Could not load neighborhoods: ${neighborhoods.error.message}`);
  if (media.error) throw new Error(`Could not load public editorial images: ${media.error.message}`);
  const restaurant = recordId ? await access.client.from("restaurants").select("*").eq("id", recordId).maybeSingle() : null;
  if (restaurant?.error) throw new Error(`Could not load restaurant: ${restaurant.error.message}`);
  if (recordId && !restaurant?.data) return <p className="cms-alert">Restaurant not found.</p>;
  if (isNew || recordId || restaurants.data?.length === 0) {
    const data = (restaurant?.data ?? {}) as RecordData;
    return <section className="cms-panel"><div className="cms-panel-header"><h2>{recordId ? "Place details" : "Add a place"}</h2>{recordId && <Link href={`/admin/reviews/new?place=${recordId}`}>Write a review of this place</Link>}</div><div className="cms-panel-body">
      <FormWithFeedback action={saveRestaurant} className="cms-form-grid">
        {recordId && <input name="id" type="hidden" value={String(data.id)} />}
        <Field label="Name" name="name" required defaultValue={String(data.name ?? "")} />
        <label className="cms-field"><span className="cms-label">Place type</span><select name="placeType" defaultValue={String(data.place_type ?? "restaurant")}><option value="restaurant">Restaurant</option><option value="activity">Activity</option></select></label>
        <Field label="URL slug" name="slug" required defaultValue={String(data.slug ?? "")} help="Lowercase words separated by hyphens." />
        <Field label="Cuisine / activity description" name="cuisine" defaultValue={String(data.cuisine ?? "")} />
        <label className="cms-field"><span className="cms-label">Neighborhood</span><select name="neighborhoodId" defaultValue={String(data.neighborhood_id ?? "")}><option value="">Not assigned</option>{neighborhoods.data?.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
        <label className="cms-field"><span className="cms-label">Featured image</span><select defaultValue={String(data.featured_media_id ?? "")} name="featuredMediaId"><option value="">None</option>{media.data?.map((image) => <option key={image.id} value={image.id}>{image.alt_text || image.id}</option>)}</select></label>
        <label className="cms-field"><span className="cms-label">Visit status</span><select defaultValue={String(data.visit_status ?? "planned")} name="visitStatus"><option value="planned">Planned</option><option value="visited">Visited</option><option value="reviewed">Reviewed</option></select></label>
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
        <Field label="Operating hours (JSON)" name="operatingHours" multiline className="cms-form-span" defaultValue={JSON.stringify(data.operating_hours ?? {}, null, 2)} help='For example: {"Monday":"11 AM–9 PM"}. Verify hours before publication.' />
        <fieldset className="cms-field cms-form-span"><legend className="cms-label">Gallery images</legend>{media.data?.length ? media.data.map((image) => <label className="cms-checkbox-field" key={image.id}><input defaultChecked={Array.isArray(data.gallery_media_ids) && data.gallery_media_ids.includes(image.id)} name="galleryMediaIds" type="checkbox" value={image.id} />{image.alt_text || image.id}</label>) : <small>Upload editorial images first.</small>}</fieldset>
        <Field label="Internal notes (not public)" name="internalNotes" multiline className="cms-form-span" defaultValue={String(data.internal_notes ?? "")} />
        {recordId && <div className="cms-form-span"><DeleteRestaurantButton id={recordId} /></div>}
      </FormWithFeedback>
    </div></section>;
  }
  return restaurants.data?.length
    ? <RestaurantDirectory restaurants={restaurants.data} />
    : <section className="cms-panel"><div className="cms-empty">No restaurants yet. Add the first verified listing.</div></section>;
}

async function VisitSection({ recordId, isNew, initialReviewId }: { recordId?: string; isNew?: boolean; initialReviewId?: string }) {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Visits and receipts are private to editors and owners.</p>;
  const [restaurantResult, visitResult, articleResult] = await Promise.all([
    access.client.from("restaurants").select("id,name").order("name"),
    recordId
      ? access.client.from("restaurant_visits").select("*").eq("id", recordId).maybeSingle()
      : access.client.from("restaurant_visits").select("id,visited_at,party_size,final_total,restaurant:restaurants(name)").order("visited_at", { ascending: false }).limit(100),
    access.client.from("articles").select("id,title,restaurant_id").order("updated_at", { ascending: false }).limit(100),
  ]);
  if (restaurantResult.error) throw new Error(`Could not load restaurants: ${restaurantResult.error.message}`);
  if (visitResult.error) throw new Error(`Could not load visits: ${visitResult.error.message}`);
  if (articleResult.error) throw new Error(`Could not load articles: ${articleResult.error.message}`);
  if (recordId && !visitResult.data) return <p className="cms-alert">Visit not found.</p>;
  if (isNew || recordId || visitResult.data?.length === 0) {
    const data = (recordId ? visitResult.data : {}) as RecordData;
    const linkedReview = articleResult.data?.find((review) => review.id === initialReviewId);
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
        <label className="cms-field"><span className="cms-label">Place visited</span><select name="restaurantId" required defaultValue={String(data.restaurant_id ?? linkedReview?.restaurant_id ?? "")}><option value="">Select a place</option>{restaurantResult.data.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <Field label="Visit date" name="visitedAt" type="date" required defaultValue={String(data.visited_at ?? new Date().toISOString().slice(0, 10))} />
        <Field label="Party size" name="partySize" type="number" required defaultValue={String(data.party_size ?? 2)} />
        <Field label="Food subtotal (USD)" name="foodSubtotal" type="number" defaultValue={String(data.food_subtotal ?? 0)} />
        <Field label="Drinks subtotal (USD)" name="drinksSubtotal" type="number" defaultValue={String(data.drinks_subtotal ?? 0)} />
        <Field label="Tickets / additional charges (USD)" name="additionalCharges" type="number" defaultValue={String(data.additional_charges ?? 0)} />
        <Field label="Sales tax (USD)" name="salesTax" type="number" defaultValue={String(data.sales_tax ?? 0)} />
        <Field label="Tip (USD)" name="tip" type="number" defaultValue={String(data.tip ?? 0)} />
        <Field label="Manual total override (optional)" name="manualTotalOverride" type="number" defaultValue={String(data.manual_total_override ?? "")} />
        <label className="cms-field cms-form-span"><span className="cms-label">Items ordered (JSON)</span><textarea defaultValue={JSON.stringify(data.items_ordered ?? [], null, 2)} name="itemsOrdered" placeholder={'[{"name":"Tacos","amount":18}]'} /><small>Use an array of verified items: {"{ name, amount? }"}. Amounts are optional and in USD.</small></label>
        <label className="cms-field"><span className="cms-label">Would you return?</span><select name="wouldReturn" defaultValue={data.would_return === true ? "yes" : data.would_return === false ? "no" : ""}><option value="">Not assessed</option><option value="yes">Yes</option><option value="no">No</option></select></label>
        <label className="cms-checkbox-field cms-form-span"><input defaultChecked={data.public_details_enabled === true} name="publicDetailsEnabled" type="checkbox" /> Allow verified item and cost breakdown, return recommendation, and verdict to appear on the associated published article. Check that these details contain no personal information.</label>
        <label className="cms-field"><span className="cms-label">Related review</span><select name="articleId" defaultValue={String(data.article_id ?? linkedReview?.id ?? "")}><option value="">None</option>{articleResult.data?.map((a) => <option key={a.id} value={a.id}>{a.title || "Untitled"}</option>)}</select></label>
        {(data.article_id || linkedReview) && <Link href={`/admin/reviews/${data.article_id || linkedReview?.id}/edit`}>Back to linked review</Link>}
        <Field label="Experience notes (internal)" name="experienceNotes" multiline className="cms-form-span" defaultValue={String(data.experience_notes ?? "")} />
        <Field label="Editorial verdict" name="editorialVerdict" multiline className="cms-form-span" defaultValue={String(data.editorial_verdict ?? "")} />
        <div className="cms-form-span"><p className="cms-muted">{data.receipt_storage_path ? "Receipt attachments are managed below." : "No receipts are attached yet."} Do not enter payment-card or other sensitive personal details in notes.</p></div>
      </FormWithFeedback> : <div className="cms-empty"><strong>Add a restaurant first</strong><Link href="/admin/places/new">Create a restaurant record</Link></div>}
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
    {data?.length
      ? <MediaLibrary items={data} publicMediaUrl={publicMediaUrl} />
      : <section className="cms-panel"><div className="cms-empty"><strong>Your library is empty</strong>Upload owned or properly licensed imagery with accurate alt text.</div></section>}
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
        <Field label="Slug" name="slug" required defaultValue="" help="Example: spring-valley. Spaces, underscores, and capitals are converted automatically when saved." />
        <Field label="SEO title" name="seoTitle" defaultValue="" />
        <Field label="Meta description" name="metaDescription" defaultValue="" />
        <Field label="Local description" name="description" multiline className="cms-form-span" defaultValue="" />
      </FormWithFeedback>
    </div></section>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Las Vegas neighborhoods</h2><p>{data?.length ?? 0} curated records</p></div>
      <div className="cms-panel-body cms-neighborhood-grid">{data?.map((item) => <FormWithFeedback action={saveNeighborhood} className="cms-neighborhood-card" key={item.id}>
        <input name="id" type="hidden" value={item.id} />
        <Field label="Name" name="name" required defaultValue={item.name} />
        <Field label="Slug" name="slug" required defaultValue={item.slug} help="Example: spring-valley. Spaces, underscores, and capitals are converted automatically when saved." />
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
  const { data, error } = await access.client.from("articles")
    .select("id,title,slug,subtitle,status,review_type,is_indexable,content,featured_media_id,category:categories(slug),author:profiles(display_name),featured:media!articles_featured_media_fk(alt_text),seo:article_seo(seo_title,meta_description,canonical_url,indexing_enabled)")
    .order("updated_at", { ascending: false }).limit(1000);
  if (error) throw new Error(`Could not run article SEO audit: ${error.message}`);
  const articles = data ?? [];
  const titleCounts = new Map<string, number>();
  const descriptionCounts = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  for (const article of articles) {
    const seo = Array.isArray(article.seo) ? article.seo[0] : article.seo;
    for (const [map, value] of [
      [titleCounts, seo?.seo_title],
      [descriptionCounts, seo?.meta_description],
      [slugCounts, article.slug],
    ] as const) {
      if (value?.trim()) map.set(value.trim().toLowerCase(), (map.get(value.trim().toLowerCase()) ?? 0) + 1);
    }
  }
  const articlePaths = new Map<string, string>(articles.map((article) => {
    return [article.id, `/${reviewSection(article.review_type === "activity" ? "activity" : "restaurant")}/${article.slug}`] as const;
  }));
  const knownCmsPaths = new Set<string>([
    ...articlePaths.values(),
  ]);
  const outboundLinks = new Map<string, string[]>();
  function collectLinks(value: unknown, found: string[] = []): string[] {
    if (Array.isArray(value)) {
      value.forEach((item) => collectLinks(item, found));
    } else if (typeof value === "object" && value !== null) {
      const record = value as Record<string, unknown>;
      if (typeof record.href === "string" && record.href.startsWith("/") && !record.href.startsWith("//")) found.push(record.href);
      Object.values(record).forEach((item) => collectLinks(item, found));
    }
    return found;
  }
  for (const article of articles) {
    const links = collectLinks(article.content);
    outboundLinks.set(article.id, links);
  }
  const knownStaticPaths = new Set(["/", "/about", "/contact", "/editorial-policy", "/privacy", "/affiliate-disclosure", "/restaurants", "/activities", "/eat", "/drink", "/explore", "/save", "/stories"]);
  const issues = articles.flatMap((article) => {
    const seo = Array.isArray(article.seo) ? article.seo[0] : article.seo;
    const featured = Array.isArray(article.featured) ? article.featured[0] : article.featured;
    const author = Array.isArray(article.author) ? article.author[0] : article.author;
    const checks: string[] = [];
    if (article.status === "published" && !article.is_indexable) checks.push("Published article is marked noindex");
    if (article.status === "published" && !seo?.indexing_enabled) checks.push("SEO indexing is disabled");
    if (!seo?.seo_title?.trim()) checks.push("SEO title is empty");
    else if (seo.seo_title.length > 60) checks.push(`SEO title is ${seo.seo_title.length} characters (over 60)`);
    if (seo?.seo_title?.trim() && titleCounts.get(seo.seo_title.trim().toLowerCase())! > 1) checks.push("SEO title is duplicated");
    if (!seo?.meta_description?.trim()) checks.push("Meta description is empty");
    else if (seo.meta_description.length > 160) checks.push(`Meta description is ${seo.meta_description.length} characters (over 160)`);
    if (seo?.meta_description?.trim() && descriptionCounts.get(seo.meta_description.trim().toLowerCase())! > 1) checks.push("Meta description is duplicated");
    if (slugCounts.get(article.slug.toLowerCase())! > 1) checks.push("URL slug is duplicated");
    if (!seo?.canonical_url?.trim()) checks.push("Canonical URL is not explicitly configured");
    else if (!seo.canonical_url.startsWith("https://")) checks.push("Canonical URL does not use HTTPS");
    if (!article.featured_media_id) checks.push("Featured image is missing");
    else if (!featured?.alt_text?.trim()) checks.push("Featured image is missing alt text");
    if (!author?.display_name?.trim()) checks.push("Author attribution is missing");
    const contentText = reviewPlainText(article.content);
    if (contentText.trim().length < 200) checks.push("Article body contains very little text");
    for (const href of outboundLinks.get(article.id) ?? []) {
      const target = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
      if (!knownStaticPaths.has(target) && !knownCmsPaths.has(target) && !target.startsWith("/admin")) {
        checks.push(`Internal link target may be broken: ${target}`);
      }
    }
    return checks.map((message) => ({ id: article.id, title: article.title || "Untitled article", status: article.status, message }));
  });
  return <section className="cms-panel"><div className="cms-panel-header"><h2>Article metadata checks</h2><p>{issues.length} items to review</p></div>
    {issues.length ? <ul className="cms-list">{issues.map((issue, index) => <li key={`${issue.id}-${issue.message}-${index}`}><AlertTriangle aria-hidden="true" size={15} /><span><Link href={`/admin/reviews/${issue.id}/edit`}><b>{issue.title}</b></Link> · {issue.message}<small className="cms-table-subtitle">{issue.status}</small></span></li>)}</ul> : <div className="cms-empty"><strong>No issues found in the latest 1,000 articles</strong>The audit checks CMS metadata and article links; it is not an external crawler and does not infer a Google ranking threshold.</div>}
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

async function AffiliateLinksSection() {
  const access = await requireAdminPage();
  if (access.state !== "authenticated") return null;
  if (access.identity.role === "contributor") return <p className="cms-alert">Affiliate link management is available to editors and owners.</p>;
  const [links, articles] = await Promise.all([
    access.client.from("affiliate_links").select("id,label,destination_url,disclosure,article_id,is_active").order("created_at", { ascending: false }),
    access.client.from("articles").select("id,title").order("updated_at", { ascending: false }).limit(500),
  ]);
  if (links.error) throw new Error(`Could not load affiliate links: ${links.error.message}`);
  if (articles.error) throw new Error(`Could not load article choices: ${articles.error.message}`);
  return <>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Add affiliate link</h2><p>Only HTTPS destinations are allowed. Disclose commissions clearly.</p></div><div className="cms-panel-body">
      <FormWithFeedback action={saveAffiliateLink} className="cms-form-grid">
        <Field label="Public label" name="label" required defaultValue="" />
        <Field label="Destination URL (HTTPS)" name="destinationUrl" required type="url" defaultValue="" />
        <label className="cms-field"><span className="cms-label">Associated article</span><select defaultValue="" name="articleId"><option value="">Not associated</option>{articles.data?.map((article) => <option key={article.id} value={article.id}>{article.title || "Untitled article"}</option>)}</select></label>
        <label className="cms-field cms-form-span"><span className="cms-label">Disclosure</span><textarea name="disclosure" /></label>
        <label className="cms-checkbox-field cms-form-span"><input name="active" type="checkbox" /> Active and available for public display when the associated article is published</label>
      </FormWithFeedback>
    </div></section>
    <section className="cms-panel"><div className="cms-panel-header"><h2>Partner links</h2><p>{links.data?.length ?? 0} records</p></div>
      {links.data?.length ? <div className="cms-panel-body cms-neighborhood-grid">{links.data.map((link) => <FormWithFeedback action={saveAffiliateLink} className="cms-neighborhood-card" key={link.id}>
        <input name="id" type="hidden" value={link.id} />
        <Field label="Public label" name="label" required defaultValue={link.label} />
        <Field label="Destination URL (HTTPS)" name="destinationUrl" required type="url" defaultValue={link.destination_url} />
        <label className="cms-field"><span className="cms-label">Associated article</span><select defaultValue={link.article_id ?? ""} name="articleId"><option value="">Not associated</option>{articles.data?.map((article) => <option key={article.id} value={article.id}>{article.title || "Untitled article"}</option>)}</select></label>
        <Field label="Disclosure" name="disclosure" multiline defaultValue={link.disclosure} />
        <label className="cms-checkbox-field"><input defaultChecked={link.is_active} name="active" type="checkbox" /> Active</label>
      </FormWithFeedback>)}</div> : <div className="cms-empty">No affiliate links have been added.</div>}
      {links.data?.map((link) => <FormWithFeedback action={setAffiliateLinkActive} className="cms-panel-body" key={`toggle-${link.id}`} submitLabel={link.is_active ? "Deactivate link" : "Activate link"}><input name="id" type="hidden" value={link.id} /><input name="active" type="hidden" value={link.is_active ? "false" : "true"} /></FormWithFeedback>)}
    </section>
  </>;
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
