"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function loadGettyWidgets() {
  // Ensure window.gie exists and is a function (never an object!)
  if (typeof window === 'undefined') return;
  
  // CRITICAL: window.gie MUST be a function, never an object
  if (typeof (window as any).gie !== 'function') {
    (window as any).gie = function(c: any) {
      ((window as any).gie.q = ((window as any).gie.q || [])).push(c);
    };
  }

  // Find all uninitialized Getty embeds
  const elements = document.querySelectorAll<HTMLElement>('.getty-gie[data-gie]:not([data-gie-initialized])');
  
  elements.forEach((el) => {
    try {
      const dataGie = el.getAttribute('data-gie');
      if (!dataGie) return;

      const config = JSON.parse(dataGie);
      
      // Initialize this embed
      (window as any).gie(() => {
        if ((window as any).gie && (window as any).gie.widgets && (window as any).gie.widgets.load) {
          (window as any).gie.widgets.load(config);
        }
      });

      // Mark as initialized
      el.setAttribute('data-gie-initialized', '1');
    } catch (error) {
      console.error('Failed to load Getty embed:', error);
    }
  });
}

export default function GettyWidgetsLoader() {
  const pathname = usePathname();

  useEffect(() => {
    // Load the Getty widgets.js script if not already loaded
    const scriptId = 'getty-widgets-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://embed-cdn.gettyimages.com/widgets.js';
      script.charset = 'utf-8';
      script.async = true;
      
      script.onload = () => {
        // Wait a bit for the script to initialize, then load widgets
        setTimeout(loadGettyWidgets, 100);
      };
      
      document.body.appendChild(script);
    } else {
      // Script already loaded, just initialize widgets
      loadGettyWidgets();
    }

    // Also re-run when pathname changes (route navigation)
    const timeoutId = setTimeout(loadGettyWidgets, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname]);

  // Also run on DOM mutations (for dynamic content)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      loadGettyWidgets();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
