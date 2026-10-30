import Link from "next/link";
import { navigation } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">
        <span className="wordmark-main">VEGAS</span>
        <span className="wordmark-sub">UNFILTERED</span>
      </Link>
      <nav aria-label="Main navigation" className="desktop-nav">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <details className="mobile-nav">
        <summary>Menu <span aria-hidden="true">+</span></summary>
        <nav aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/about">About us</Link>
        </nav>
      </details>
    </header>
  );
}
