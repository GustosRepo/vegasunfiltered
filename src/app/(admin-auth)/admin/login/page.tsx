import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getAdminIdentity } from "@/lib/admin-auth";
import { LockKeyhole } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in | Vegas Unfiltered CMS",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const { identity } = await getAdminIdentity();
  if (identity) redirect("/admin");

  return (
    <main className="cms-login-page">
      <div className="cms-login-brand">
        <Link href="/" aria-label="Vegas Unfiltered public website">
          <span>VEGAS</span> UNFILTERED
        </Link>
        <span className="cms-brand-rule" />
        <span>EDITORIAL DESK</span>
      </div>
      <section className="cms-login-card">
        <div className="cms-login-icon"><LockKeyhole aria-hidden="true" size={20} /></div>
        <span className="cms-overline">PRIVATE WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p>Sign in to manage stories, reporting, and the details behind them.</p>
        <LoginForm />
      </section>
      <p className="cms-login-footer">
        <Link href="/">← Back to Vegas Unfiltered</Link>
        <span>ENCRYPTED EDITORIAL ACCESS</span>
      </p>
    </main>
  );
}
