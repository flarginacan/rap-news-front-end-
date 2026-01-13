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
    // CRITICAL: Set up the queue function BEFORE loading widgets.js
    // Getty's widgets.js expects window.gie to be a queue function when it loads
    if (!window.gie || typeof window.gie !== 'function') {
      window.gie = function(c: any) {
        (window.gie.q = window.gie.q || []).push(c);
      };
      console.log('[Getty] Set up queue function before loading widgets.js');
    }

    // If script already exists, just wait for ready
    const existing = document.querySelector('script[data-getty="widgets"]') as HTMLScriptElement | null;

    const waitUntilReady = () => {
      const start = Date.now();
      let checkCount = 0;
      const tick = () => {
        checkCount++;
        
        // Debug logging every 50 checks (~3 seconds at 60fps)
        if (checkCount % 50 === 0) {
          console.log(`[Getty] Waiting for widgets.js... (${checkCount} checks, ${Math.round((Date.now() - start) / 1000)}s)`);
          console.log(`[Getty] window.gie exists:`, !!window.gie, typeof window.gie);
          console.log(`[Getty] window.gie.widgets exists:`, !!window.gie?.widgets);
          console.log(`[Getty] window.gie.widgets.load exists:`, !!window.gie?.widgets?.load, typeof window.gie?.widgets?.load);
        }
        
        if (window.gie?.widgets?.load && typeof window.gie.widgets.load === "function") {
          console.log(`[Getty] ✅ widgets.js ready after ${checkCount} checks (${Math.round((Date.now() - start) / 1000)}s)`);
          resolve();
          return;
        }
        if (Date.now() - start > 15000) {
          console.error(`[Getty] ❌ Timeout after 15s. Final state:`);
          console.error(`  window.gie:`, window.gie, typeof window.gie);
          console.error(`  window.gie?.widgets:`, window.gie?.widgets);
          console.error(`  window.gie?.widgets?.load:`, window.gie?.widgets?.load, typeof window.gie?.widgets?.load);
          console.error(`  Script in DOM:`, !!document.querySelector('script[src*="widgets.js"]'));
          reject(new Error("Getty widgets.js loaded but window.gie.widgets.load never became ready"));
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    };

    if (existing) {
      console.log('[Getty] Script already exists, waiting for ready...');
      waitUntilReady();
      return;
    }

    // Inject script ourselves (guaranteed client-side)
    const s = document.createElement("script");
    s.src = "https://embed-cdn.gettyimages.com/widgets.js";
    s.async = true;
    s.charset = "utf-8";
    s.dataset.getty = "widgets";

    s.onload = () => {
      console.log('[Getty] widgets.js script loaded, waiting for API to be ready...');
      // Give it a moment to execute
      setTimeout(() => waitUntilReady(), 100);
    };
    
    s.onerror = (e) => {
      console.error('[Getty] ❌ Script failed to load:', e);
      reject(new Error("Failed to load Getty widgets.js (blocked or network error)"));
    };

    console.log('[Getty] Injecting widgets.js script...');
    document.head.appendChild(s);
  });

  return window.__gettyReadyPromise;
}
