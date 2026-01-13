// lib/getty.ts
declare global {
  interface Window {
    gie?: any;
    __gettyReadyPromise?: Promise<void>;
  }
}

export function ensureGettyReady(): Promise<void> {
  // If Getty is already ready, resolve immediately
  if (window.gie?.widgets?.load && typeof window.gie.widgets.load === "function") {
    return Promise.resolve();
  }

  // Reuse a single promise across the whole app
  if (window.__gettyReadyPromise) return window.__gettyReadyPromise;

  window.__gettyReadyPromise = new Promise<void>((resolve, reject) => {
    // If script already exists, just wait for ready
    const existing = document.querySelector('script[data-getty="widgets"]') as HTMLScriptElement | null;

    const waitUntilReady = () => {
      const start = Date.now();
      const tick = () => {
        if (window.gie?.widgets?.load && typeof window.gie.widgets.load === "function") {
          resolve();
          return;
        }
        if (Date.now() - start > 15000) {
          reject(new Error("Getty widgets.js loaded but window.gie.widgets.load never became ready"));
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    };

    if (existing) {
      waitUntilReady();
      return;
    }

    // Inject script ourselves (guaranteed client-side)
    const s = document.createElement("script");
    s.src = "https://embed-cdn.gettyimages.com/widgets.js";
    s.async = true;
    s.charset = "utf-8";
    s.dataset.getty = "widgets";

    s.onload = () => waitUntilReady();
    s.onerror = () => reject(new Error("Failed to load Getty widgets.js (blocked or network error)"));

    document.head.appendChild(s);
  });

  return window.__gettyReadyPromise;
}
