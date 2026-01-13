// lib/getty.ts
declare global {
  interface Window {
    gie?: any;
    __gettyScriptPromise?: Promise<void>;
  }
}

export function ensureGettyScript(): Promise<void> {
  if (window.__gettyScriptPromise) return window.__gettyScriptPromise;

  window.__gettyScriptPromise = new Promise<void>((resolve, reject) => {
    // If script already exists, resolve when it finishes
    const existing = document.querySelector('script[data-getty="widgets"]') as HTMLScriptElement | null;
    if (existing) {
      // If already loaded, resolve immediately
      if (window.gie) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Getty widgets.js failed to load")));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://embed-cdn.gettyimages.com/widgets.js";
    s.async = true;
    s.charset = "utf-8";
    s.dataset.getty = "widgets";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Getty widgets.js failed to load"));
    document.head.appendChild(s);
  });

  return window.__gettyScriptPromise;
}
