import type { ReactNode } from "react";
import Link from "next/link";

export function SponsoredContentLabel() {
  return <span className="sponsored-label">SPONSORED CONTENT</span>;
}

export function AffiliateDisclosure() {
  return (
    <p className="disclosure-note">
      This story contains affiliate links. We may earn a commission if you choose
      to buy through them; that does not change our editorial judgment. See our{" "}
      <Link href="/affiliate-disclosure">affiliate disclosure</Link>.
    </p>
  );
}

export function AdSlot({
  placement,
  enabled = false,
  children,
}: {
  placement: string;
  enabled?: boolean;
  children?: ReactNode;
}) {
  if (!enabled || !children) return null;
  return (
    <aside aria-label="Advertisement" className="ad-slot" data-placement={placement}>
      <span className="ad-slot-label">ADVERTISEMENT</span>
      {children}
    </aside>
  );
}
