import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/json-ld";
import type { Metadata } from "next";

export const metadata: Metadata = {
  other: { "google-adsense-account": "ca-pub-8863066373093222" },
};

export default function PublicSiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <OrganizationJsonLd />
    <WebsiteJsonLd />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader />
    <div id="main-content" tabIndex={-1}>{children}</div>
    <SiteFooter />
  </>;
}
