"use client";

import { useEffect, useRef } from "react";
import { ensureGettyScript } from "@/lib/getty";

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
      try {
        await ensureGettyScript(); // Wait for widgets.js to load

        // Wait for anchor to be in DOM and widgets API to be ready
        const initEmbed = () => {
          const anchor = document.getElementById(anchorId);
          if (!anchor) {
            requestAnimationFrame(initEmbed);
            return;
          }

          // Check if widgets API is ready
          if (!window.gie?.widgets?.load || typeof window.gie.widgets.load !== 'function') {
            requestAnimationFrame(initEmbed);
            return;
          }

          // Verify anchor has required attributes
          if (!anchor.getAttribute('data-items')) {
            console.warn("[Getty] Anchor missing data-items, retrying...");
            requestAnimationFrame(initEmbed);
            return;
          }

          // Call widgets.load() to initialize the embed
          try {
            window.gie.widgets.load({
              id: anchorId,
              items: items,
              caption: false,
              tld: 'com',
              w: '594',
              h: '396'
            });
            console.log("[Getty] Embed initialized for anchor:", anchorId);
          } catch (error) {
            console.error("[Getty] Error initializing embed:", error);
          }
        };

        // Start initialization after a frame
        requestAnimationFrame(initEmbed);
      } catch (error) {
        console.error("[Getty] Error loading script:", error);
      }
    })();
  }, [anchorId, items]);

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
