import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_SHARE_IMAGE } from "@/lib/site";

export const alt = SITE_SHARE_IMAGE.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "64px 72px", background: "#f5f1e8", color: "#171817", fontFamily: "sans-serif", borderTop: "16px solid #c65a35" }}>
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: "#81361f" }}>LAS VEGAS RESTAURANTS & ACTIVITIES</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -4 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, lineHeight: 1.3 }}>Real visits. Honest reviews.</div>
        <div style={{ fontSize: 40, lineHeight: 1.3 }}>Your money matters.</div>
      </div>
      <div style={{ display: "flex", fontSize: 24 }}>vegasunfiltered.com</div>
    </div>,
    size,
  );
}
