"use client";

import { useEffect, useMemo, useRef } from "react";

type GettyConfig = {
  id: string;        // anchor id from WP (e.g. jOP8G5-oTsJDVWcSV67p2g)
  sig: string;
  items: string;     // e.g. "2244661881"
  w?: string;        // "594px" etc
  h?: string;        // "396px" etc
  caption?: boolean;
  tld?: string;
  is360?: boolean;
};

declare global {
  interface Window {
    gie?: any;
  }
}

function waitForGettyReady(timeoutMs = 8000) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.gie && window.gie.widgets && typeof window.gie.widgets.load === "function") {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Getty widgets.js not ready"));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

interface GettyWidgetEmbedProps {
  widgetConfig: GettyConfig;
}

export default function GettyWidgetEmbed({ widgetConfig }: GettyWidgetEmbedProps) {
  const ran = useRef(false);

  // ensure stable config object
  const cfg = useMemo(() => {
    return {
      id: widgetConfig.id,
      sig: widgetConfig.sig,
      items: widgetConfig.items,
      w: widgetConfig.w ?? "100%",
      h: widgetConfig.h ?? "520px",
      caption: widgetConfig.caption ?? false,
      tld: widgetConfig.tld ?? "com",
      is360: widgetConfig.is360 ?? false,
    };
  }, [widgetConfig]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // anchor must exist first
      const el = document.getElementById(cfg.id);
      if (!el) {
        console.warn("[Getty] anchor not found:", cfg.id);
        ran.current = false; // allow retry if it mounts later
        return;
      }

      try {
        await waitForGettyReady();
        // ✅ call load with config only AFTER ready + anchor exists
        window.gie.widgets.load(cfg);
      } catch (err) {
        console.error("[Getty] load failed:", err);
        ran.current = false;
      }
    })();
  }, [cfg]);

  // ✅ Render anchor as JSX (no scripts, no innerHTML)
  return (
    <a
      id={cfg.id}
      className="gie-single"
      href={`https://www.gettyimages.com/detail/${cfg.items}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: "#a7a7a7",
        textDecoration: "none",
        fontWeight: "normal",
        border: "none",
        display: "inline-block",
      }}
    >
      Embed from Getty Images
    </a>
  );
}
