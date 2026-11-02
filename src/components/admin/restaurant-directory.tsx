"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  place_type: string;
  visit_status: string;
  updated_at: string;
};

export function RestaurantDirectory({ restaurants }: { restaurants: RestaurantRow[] }) {
  const [query, setQuery] = useState("");
  const [visitStatus, setVisitStatus] = useState("");
  const [placeType, setPlaceType] = useState("");
  const visible = useMemo(() => restaurants.filter((restaurant) => {
    const matchesQuery = [restaurant.name, restaurant.slug, restaurant.cuisine]
      .some((value) => value.toLowerCase().includes(query.trim().toLowerCase()));
    return matchesQuery && (!visitStatus || restaurant.visit_status === visitStatus) && (!placeType || restaurant.place_type === placeType);
  }), [restaurants, query, visitStatus, placeType]);
  return <section className="cms-panel">
    <div className="cms-panel-header"><h2>Reviewed places</h2><p>{visible.length} shown · {restaurants.length} records</p></div>
    <div className="cms-panel-body"><div className="cms-toolbar">
      <label><span className="cms-sr-only">Search places</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search name, details, or slug" value={query} /></label>
      <label><span className="cms-sr-only">Filter place type</span><select onChange={(event) => setPlaceType(event.target.value)} value={placeType}><option value="">All places</option><option value="restaurant">Restaurants</option><option value="activity">Activities</option></select></label>
      <label><span className="cms-sr-only">Filter visit status</span><select onChange={(event) => setVisitStatus(event.target.value)} value={visitStatus}><option value="">All visit statuses</option>{["planned", "visited", "reviewed"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
    </div></div>
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>PLACE</th><th>TYPE / DETAILS</th><th>VISIT STATUS</th><th>UPDATED</th></tr></thead><tbody>
      {visible.map((row) => <tr key={row.id}><td><Link className="cms-table-title" href={`/admin/places/${row.id}/edit`}>{row.name}</Link><span className="cms-table-subtitle">/{row.slug}</span></td><td>{row.place_type} · {row.cuisine || "—"}</td><td>{row.visit_status.replace("_", " ")}</td><td>{new Date(row.updated_at).toLocaleDateString()}</td></tr>)}
      {!visible.length && <tr><td className="cms-empty" colSpan={4}>No places match these filters.</td></tr>}
    </tbody></table></div>
  </section>;
}
