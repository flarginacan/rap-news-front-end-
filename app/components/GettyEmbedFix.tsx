'use client';

import { useEffect } from 'react';

function toInt(v: string | null) {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default function GettyEmbedFix() {
  useEffect(() => {
    const wraps = Array.from(document.querySelectorAll<HTMLElement>('.getty-embed-wrap'));
    if (!wraps.length) return;

    for (const wrap of wraps) {
      const iframe = wrap.querySelector<HTMLIFrameElement>('iframe');
      if (!iframe) continue;

      // Read width/height from the iframe (Getty usually provides these)
      const w =
        toInt(iframe.getAttribute('width')) ||
        toInt((iframe as any).width?.toString?.()) ||
        null;

      const h =
        toInt(iframe.getAttribute('height')) ||
        toInt((iframe as any).height?.toString?.()) ||
        null;

      // Convert the old padding-bottom hack into aspect-ratio
      wrap.style.position = 'relative';
      wrap.style.overflow = 'hidden';
      wrap.style.maxWidth = '100%';
      wrap.style.height = 'auto';
      wrap.style.paddingBottom = '0';

      // If we can compute a ratio, use it. Otherwise fallback to 16:9.
      wrap.style.aspectRatio = w && h ? `${w} / ${h}` : '16 / 9';

      // Force iframe to fill the wrapper
      iframe.style.position = 'absolute';
      iframe.style.inset = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.display = 'block';
    }
  }, []);

  return null;
}
