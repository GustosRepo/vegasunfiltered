"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { AdSlot } from "@/components/monetization";

const publisher = "ca-pub-8863066373093222";
const slot = "5213709246";
type AdSenseWindow = Window & { adsbygoogle?: { push: (request: Record<string, never>) => unknown } };

export function ReviewInArticleAd() {
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
        console.warn("The review advertisement could not initialize.", error);
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
    <AdSlot enabled placement="review-after-experience">
      <ins ref={element} className="adsbygoogle" style={{ display: "block", textAlign: "center" }}
        data-ad-layout="in-article" data-ad-format="fluid" data-ad-client={publisher} data-ad-slot={slot} />
    </AdSlot>
    <Script id="adsense-review-library" async crossOrigin="anonymous" strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisher}`}
      onLoad={() => setReady(true)} onReady={() => setReady(true)}
      onError={() => setFailed(true)} />
  </>;
}
