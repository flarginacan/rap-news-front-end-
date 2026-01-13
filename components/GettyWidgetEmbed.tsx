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

      // Wait for anchor to be in DOM before calling widgets.load()
      const checkAndLoad = () => {
        const anchor = document.getElementById(anchorId);
        if (!anchor) {
          // Anchor not ready yet, try again
          requestAnimationFrame(checkAndLoad);
          return;
        }

        // Anchor exists, now call widgets.load()
        if (window.gie?.widgets?.load) {
          window.gie.widgets.load();
        } else {
          console.error("[Getty] widgets.load missing even after script");
          ran.current = false;
        }
      };

      // Start checking after a frame
      requestAnimationFrame(checkAndLoad);
    })();
  }, [anchorId]);

  return (
    <a
      id={anchorId}
      className="gie-single"
      href={`https://www.gettyimages.com/detail/${items}`}
      target="_blank"
      rel="noopener noreferrer"
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
      }}
    >
      Embed from Getty Images
    </a>
  );
}
