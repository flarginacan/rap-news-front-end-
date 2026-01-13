// lib/getty.ts
declare global {
  interface Window {
    gie?: any;
    __gettyScriptPromise?: Promise<void>;
  }
}

export function ensureGettyScript(): Promise<void> {
  // If already ready, resolve immediately
  if (window.gie?.widgets?.load && typeof window.gie.widgets.load === "function") {
    return Promise.resolve();
  }

  if (window.__gettyScriptPromise) return window.__gettyScriptPromise;

  window.__gettyScriptPromise = new Promise<void>((resolve, reject) => {
    // CRITICAL: Set up queue function BEFORE loading widgets.js
    // Getty's widgets.js expects window.gie to be a queue function when it loads
    if (!window.gie || typeof window.gie !== 'function') {
      window.gie = function(c: any) {
        (window.gie.q = window.gie.q || []).push(c);
      };
    }

    // Wait for widgets.load to be ready
    const waitForReady = () => {
      const start = Date.now();
      const tick = () => {
        if (window.gie?.widgets?.load && typeof window.gie.widgets.load === "function") {
          resolve();
          return;
        }
        if (Date.now() - start > 10000) {
          reject(new Error("Getty widgets.js loaded but window.gie.widgets.load never became ready"));
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    };

    // If script already exists, just wait for ready
    const existing = document.querySelector('script[data-getty="widgets"]') as HTMLScriptElement | null;
    if (existing) {
      // If script is already in DOM, wait for API (script might be loading or loaded)
      // Check if window.gie exists as a quick check, otherwise wait for load event
      if (window.gie) {
        waitForReady();
      } else {
        existing.addEventListener("load", () => waitForReady());
        existing.addEventListener("error", () => reject(new Error("Getty widgets.js failed to load")));
        // Also start waiting in case load already fired
        setTimeout(() => waitForReady(), 100);
      }
      return;
    }

    const s = document.createElement("script");
    s.src = "https://embed-cdn.gettyimages.com/widgets.js";
    s.async = true;
    s.charset = "utf-8";
    s.dataset.getty = "widgets";
    s.onload = () => waitForReady();
    s.onerror = () => reject(new Error("Getty widgets.js failed to load"));
    document.head.appendChild(s);
  });

  return window.__gettyScriptPromise;
}
