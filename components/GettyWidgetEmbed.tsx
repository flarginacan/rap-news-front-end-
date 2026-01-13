"use client";

import { useEffect, useMemo, useRef } from "react";
import { ensureGettyReady } from "@/lib/getty";

type GettyConfig = {
  id: string;
  sig: string;
  items: string;
  w?: string;
  h?: string;
  caption?: boolean;
  tld?: string;
  is360?: boolean;
};

declare global {
  interface Window { gie?: any; }
}

interface GettyWidgetEmbedProps {
  widgetConfig: GettyConfig;
}

export default function GettyWidgetEmbed({ widgetConfig }: GettyWidgetEmbedProps) {
  const ran = useRef(false);

  const cfg = useMemo(() => ({
    id: widgetConfig.id,
    sig: widgetConfig.sig,
    items: widgetConfig.items,
    w: widgetConfig.w ?? "100%",
    h: widgetConfig.h ?? "520px",
    caption: widgetConfig.caption ?? false,
    tld: widgetConfig.tld ?? "com",
    is360: widgetConfig.is360 ?? false,
  }), [widgetConfig]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // ensure anchor exists
      const el = document.getElementById(cfg.id);
      if (!el) {
        console.warn("[Getty] anchor not found:", cfg.id);
        ran.current = false;
        return;
      }

      try {
        await ensureGettyReady();
        window.gie.widgets.load(cfg);
      } catch (e) {
        console.error("[Getty] load failed:", e);
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
