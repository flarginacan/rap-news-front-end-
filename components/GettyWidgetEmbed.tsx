"use client";

import { useEffect, useRef } from "react";
import { ensureGettyScript } from "@/lib/getty"; // loader ONLY loads the script, no queue setup

declare global {
  interface Window { gie?: any; }
}

export default function GettyWidgetEmbed({ items }: { items: string }) {
  const anchorId = useRef(`gie_${Math.random().toString(36).slice(2)}`).current;
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      await ensureGettyScript(); // only inject <script src=...> and wait for onload

      // Wait for anchor to be in DOM
      // Getty's widgets.js will automatically scan the DOM for .gie-single anchors
      // We don't need to call widgets.load() - it happens automatically when the script loads
      const checkAnchor = () => {
        const anchor = document.getElementById(anchorId);
        if (!anchor) {
          // Anchor not ready yet, try again
          requestAnimationFrame(checkAnchor);
          return;
        }

        // Verify anchor has required attributes
        if (!anchor.id || !anchor.getAttribute('data-items')) {
          console.warn("[Getty] Anchor missing required attributes, retrying...");
          requestAnimationFrame(checkAnchor);
          return;
        }

        // Anchor exists and has required attributes
        // Getty's script will automatically process it - no need to call widgets.load()
        // The script scans the DOM on load and finds all .gie-single anchors
        console.log("[Getty] Anchor ready, waiting for widgets.js to process it");
      };

      // Start checking after a frame
      requestAnimationFrame(checkAnchor);
    })();
  }, [anchorId]);

  return (
    <a
      id={anchorId}
      className="gie-single"
      href="#"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      data-items={items}
      data-caption="false"
      data-tld="com"
      data-width="594"
      data-height="396"
      style={{
        color: "#a7a7a7",
        textDecoration: "none",
        fontWeight: "normal",
        border: "none",
        display: "inline-block",
        cursor: "default",
        pointerEvents: "none",
      }}
    >
      Embed from Getty Images
    </a>
  );
}
