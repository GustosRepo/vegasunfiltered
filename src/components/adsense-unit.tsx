"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { AdSlot } from "@/components/monetization";

const publisher = "ca-pub-8863066373093222";
type Placement = "review-after-experience" | "homepage-after-reviews";
const units: Record<Placement, { slot: string; format: "fluid" | "auto"; layout?: "in-article"; fullWidth?: boolean }> = {
  "review-after-experience": { slot: "5213709246", format: "fluid", layout: "in-article" },
  "homepage-after-reviews": { slot: "8538710734", format: "auto", fullWidth: true },
};
type AdSenseWindow = Window & { adsbygoogle?: { push: (request: Record<string, never>) => unknown } };

export function AdSenseUnit({ placement }: { placement: Placement }) {
  const unit = units[placement];
  const element = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ad = element.current;
    if (!ad) return;
    // Activity keeps inactive pages in the DOM. Do not let Google select an
    // unrequested unit on a hidden page if navigation beats the library load.
    ad.classList.add("adsbygoogle");
    const removePendingUnit = () => {
      if (!requested.current) ad.classList.remove("adsbygoogle");
    };
    if (!ready) return removePendingUnit;
    let observer: ResizeObserver | undefined;
    const request = () => {
      if (requested.current || ad.hasAttribute("data-adsbygoogle-status") || !ad.isConnected || ad.getBoundingClientRect().width <= 0) return;
      // Queue exactly once for this mounted unit, including React Strict Mode.
      requested.current = true;
      observer?.disconnect();
      try {
        const adWindow = window as AdSenseWindow;
        (adWindow.adsbygoogle ??= [] as Record<string, never>[]).push({});
      } catch (error) {
        console.warn("The advertisement could not initialize.", error);
        setFailed(true);
      }
    };
    request();
    if (!requested.current) {
      observer = new ResizeObserver(request);
      observer.observe(ad);
    }
    return () => {
      observer?.disconnect();
      removePendingUnit();
    };
  }, [ready]);

  if (failed) return null;
  return <>
    <AdSlot enabled placement={placement}>
      <ins ref={element} className="adsbygoogle" style={{ display: "block", textAlign: unit.layout ? "center" : undefined }}
        data-ad-layout={unit.layout} data-ad-format={unit.format} data-ad-client={publisher} data-ad-slot={unit.slot}
        data-full-width-responsive={unit.fullWidth ? "true" : undefined} />
    </AdSlot>
    <Script id="adsense-site-library" async crossOrigin="anonymous" strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}`}
      onLoad={() => setReady(true)} onReady={() => setReady(true)}
      onError={() => setFailed(true)} />
  </>;
}
