import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Vegas Unfiltered" },
  description: "That page is not here. Find another way into Las Vegas.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="not-found-page page-shell">
      <span className="eyebrow">WRONG TURN. IT HAPPENS.</span>
      <h1>404<span className="period">.</span></h1>
      <p>There&apos;s nothing on this block. Try one of the streets that&apos;s still open.</p>
      <div>
        <Link className="button button-dark" href="/">BACK TO THE HOME PAGE <span aria-hidden="true">↗</span></Link>
        <Link className="text-link" href="/explore">EXPLORE THE CITY <span aria-hidden="true">↗</span></Link>
      </div>
    </main>
  );
}
