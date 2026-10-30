import Link from "next/link";

const links = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Editorial policy", href: "/editorial-policy" },
  { label: "Privacy", href: "/privacy" },
  { label: "Affiliate disclosure", href: "/affiliate-disclosure" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="wordmark footer-mark" href="/">
          <span className="wordmark-main">VEGAS</span>
          <span className="wordmark-sub">UNFILTERED</span>
        </Link>
        <p>Eat like a local. Party like a local. Save like a local.</p>
        <nav aria-label="Footer navigation">
          {links.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="footer-social-note">
          <span>OFFICIAL SOCIALS</span>
          <p>Links will appear here when our public profiles are live.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Independent by intention. Honest by design.</span>
        <span>© Vegas Unfiltered</span>
      </div>
    </footer>
  );
}
