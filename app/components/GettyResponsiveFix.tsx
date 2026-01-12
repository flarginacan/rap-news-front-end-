'use client';

import { useEffect } from 'react';

function parsePx(v: string | null | undefined): number | null {
  if (!v) return null;
  const m = String(v).match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function applyFixToGettyIframe(iframe: HTMLIFrameElement) {
  // Only touch Getty embeds
  const src = iframe.getAttribute('src') || '';
  const isGetty =
    src.includes('embed.gettyimages.com') ||
    src.includes('gettyimages.com') ||
    src.includes('embed-cdn.gettyimages.com');

  if (!isGetty) return;

  // Try to get the TRUE dimensions
  const wAttr = parsePx(iframe.getAttribute('width'));
  const hAttr = parsePx(iframe.getAttribute('height'));

  // Sometimes Getty sets inline style width/height
  const wStyle = parsePx(iframe.style.width);
  const hStyle = parsePx(iframe.style.height);

  const w = wAttr ?? wStyle;
  const h = hAttr ?? hStyle;

  // Fallback if attributes missing
  const ratio = w && h && h !== 0 ? w / h : 594 / 394; // Getty default from your snippet

  // Force responsive sizing + correct aspect ratio (kills extra black space)
  iframe.style.width = '100%';
  iframe.style.maxWidth = '100%';
  iframe.style.height = 'auto';
  (iframe.style as any).aspectRatio = `${ratio}`;
  iframe.style.display = 'block';
  iframe.style.border = '0';
  iframe.style.margin = '0 auto';

  // Also fix common wrapper issues (some themes wrap the iframe)
  const parent = iframe.parentElement;
  if (parent) {
    parent.style.width = '100%';
    parent.style.maxWidth = '100%';
    parent.style.marginLeft = 'auto';
    parent.style.marginRight = 'auto';
    parent.style.padding = '0';
    // IMPORTANT: remove any padding-bottom hacks if present
    if (parent.style.paddingBottom) parent.style.paddingBottom = '0';
    parent.classList.add('getty-embed-fixed');
  }
}

function fixAllGettyEmbeds() {
  const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
  for (const iframe of iframes) {
    // Skip if already fixed to prevent infinite loops
    if (iframe.classList.contains('getty-fixed')) continue;
    applyFixToGettyIframe(iframe);
    iframe.classList.add('getty-fixed');
  }

  // Getty sometimes injects inside .gie-single container
  const containers = Array.from(document.querySelectorAll('.gie-single, .gie-embed, [id^="gie-"], .getty-embed-fixed'));
  for (const el of containers) {
    if ((el as HTMLElement).classList.contains('getty-container-fixed')) continue;
    (el as HTMLElement).style.width = '100%';
    (el as HTMLElement).style.maxWidth = '100%';
    (el as HTMLElement).classList.add('getty-container-fixed');
  }
}

export default function GettyResponsiveFix() {
  useEffect(() => {
    let isRunning = false;
    
    const fixWithDebounce = () => {
      if (isRunning) return;
      isRunning = true;
      
      try {
        fixAllGettyEmbeds();
      } finally {
        // Use requestAnimationFrame to debounce and prevent infinite loops
        requestAnimationFrame(() => {
          isRunning = false;
        });
      }
    };

    // Run immediately
    fixWithDebounce();

    const observer = new MutationObserver((mutations) => {
      // Only process if there are actual changes to iframes or Getty containers
      const hasRelevantChanges = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          const added = Array.from(mutation.addedNodes);
          return added.some(node => 
            node.nodeType === 1 && (
              (node as Element).tagName === 'IFRAME' ||
              (node as Element).querySelector?.('iframe') ||
              (node as Element).classList?.contains('gie-single') ||
              (node as Element).classList?.contains('gie-embed')
            )
          );
        }
        return false;
      });
      
      if (hasRelevantChanges) {
        fixWithDebounce();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also re-run after page settles (with delays)
    const t1 = window.setTimeout(fixWithDebounce, 500);
    const t2 = window.setTimeout(fixWithDebounce, 1500);
    const t3 = window.setTimeout(fixWithDebounce, 3000);

    return () => {
      observer.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  return null;
}
