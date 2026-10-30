import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  BookOpenText,
  Building2,
  Camera,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  MapPin,
  Search,
  Settings,
  Users,
  Wine,
} from "lucide-react";
import { getAdminIdentity } from "@/lib/admin-auth";
import { signOut } from "@/app/actions/auth";
import "./admin.css";

export const metadata: Metadata = {
  title: "Editorial Desk",
  robots: { index: false, follow: false },
};

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Articles", href: "/admin/articles", icon: FileText },
  { label: "Restaurants", href: "/admin/restaurants", icon: Building2 },
  { label: "Restaurant visits", href: "/admin/visits", icon: Wine },
  { label: "Media library", href: "/admin/media", icon: Camera },
  { label: "Neighborhoods", href: "/admin/neighborhoods", icon: MapPin },
  { label: "SEO audit", href: "/admin/seo", icon: Search },
  { label: "Analytics", href: "/admin/analytics", icon: Activity },
  { label: "Team", href: "/admin/team", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><DynamicMarker /></Suspense>
      <Suspense fallback={<div className="cms-loading">Opening the editorial desk…</div>}>
        <AuthenticatedAdminLayout>{children}</AuthenticatedAdminLayout>
      </Suspense>
    </>
  );
}

async function DynamicMarker() {
  await connection();
  return null;
}

async function AuthenticatedAdminLayout({ children }: { children: ReactNode }) {
  const { client, identity } = await getAdminIdentity();
  if (!client) {
    return (
      <main className="cms-setup">
        <span className="cms-overline">EDITORIAL CMS · SETUP REQUIRED</span>
        <h1>Connect the publishing desk.</h1>
        <p>
          The public site is still available. Configure Supabase and apply the
          editorial migration before opening admin data or actions.
        </p>
        <ol>
          <li>Add the values in <code>.env.example</code> to your local environment.</li>
          <li>Apply the SQL migration in <code>supabase/migrations/</code>.</li>
          <li>Provision an owner account using the setup steps in <code>README.md</code>.</li>
        </ol>
        <Link className="cms-button-link" href="/">Return to the public site</Link>
      </main>
    );
  }
  if (!identity) redirect("/admin/login");

  return (
    <div className="cms-app">
      <aside className="cms-sidebar">
        <Link className="cms-logo" href="/admin" aria-label="Editorial desk overview">
          <span className="cms-logo-mark">VU</span>
          <span>VEGAS <b>UNFILTERED</b><small>EDITORIAL DESK</small></span>
        </Link>
        <div className="cms-workspace"><span className="cms-workspace-dot" /> Vegas Unfiltered <ChevronDown size={14} /></div>
        <nav aria-label="CMS navigation" className="cms-navigation">
          <span className="cms-nav-label">WORKSPACE</span>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href}>
              <Icon aria-hidden="true" size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="cms-sidebar-bottom">
          <Link href="/editorial-policy"><CircleHelp aria-hidden="true" size={16} /> Editorial standards</Link>
          <span className="cms-user-avatar" aria-hidden="true">
            {(identity.displayName[0] ?? "V").toUpperCase()}
          </span>
          <span className="cms-user-info"><b>{identity.displayName}</b><small>{identity.role}</small></span>
          <form action={signOut}>
            <button aria-label="Sign out" className="cms-icon-button" title="Sign out" type="submit">
              <ChevronDown aria-hidden="true" size={16} />
            </button>
          </form>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-topbar">
          <span>INDEPENDENT BY INTENTION <i /> VEGAS, NEVADA</span>
          <a href="/" rel="noreferrer" target="_blank">View public site ↗</a>
        </header>
        <div className="cms-mobile-nav">
          <Link className="cms-logo" href="/admin">
            <span className="cms-logo-mark">VU</span>
            <span>EDITORIAL DESK<small>{identity.displayName}</small></span>
          </Link>
          <details>
            <summary><BookOpenText aria-hidden="true" size={18} /> Navigation</summary>
            <nav aria-label="Mobile CMS navigation">
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link href={href} key={href}><Icon aria-hidden="true" size={17} />{label}</Link>
              ))}
              <form action={signOut}><button type="submit">Sign out</button></form>
            </nav>
          </details>
        </div>
        <main className="cms-content">{children}</main>
      </div>
    </div>
  );
}
