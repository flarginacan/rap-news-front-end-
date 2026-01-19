export function fixGettyIframeSrc(html: string, opts?: { debug?: boolean }) {
  if (!html || typeof html !== "string") return html;

  // Only fix src attributes on Getty iframes.
  // Do NOT parse/serialize the whole DOM (that can re-encode & to &amp;).
  // We do a targeted replace on src="...".
  const debug = !!opts?.debug;

  // Helper: decode minimal entities that break query params
  const decodeEntities = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&#038;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  // Very strict validator: we only care that the embed URL is plausibly valid
  const validateGettySrc = (src: string) => {
    try {
      if (!src.includes("embed.gettyimages.com/embed/")) return { ok: false, reason: "not-getty-embed" };
      const qIndex = src.indexOf("?");
      if (qIndex === -1) return { ok: false, reason: "no-query" };

      const query = src.slice(qIndex + 1);
      const params = new URLSearchParams(query);

      const et = params.get("et") || "";
      const sig = params.get("sig") || "";

      // Heuristics: real et/sig are long. Also they should not be identical.
      // Updated: et can be shorter (min 20), sig should be longer (min 40)
      if (!et || !sig) return { ok: false, reason: "missing-et-or-sig", etLen: et.length, sigLen: sig.length };
      if (et.length < 20 || sig.length < 40) return { ok: false, reason: "et-or-sig-too-short", etLen: et.length, sigLen: sig.length };
      if (et === sig) return { ok: false, reason: "et-equals-sig", etLen: et.length, sigLen: sig.length };

      return { ok: true, etLen: et.length, sigLen: sig.length };
    } catch {
      return { ok: false, reason: "parse-failed" };
    }
  };

  let firstGettySrc: string | null = null;
  const out = html.replace(
    /<iframe\b([^>]*?)\bsrc\s*=\s*"([^"]+)"([^>]*?)>/gi,
    (match, pre, srcRaw, post) => {
      const isGetty = /embed\.gettyimages\.com\/embed\//i.test(srcRaw);
      if (!isGetty) return match;

      const src = decodeEntities(srcRaw);
      if (!firstGettySrc) firstGettySrc = src;

      const v = validateGettySrc(src);

      // If invalid, remove the iframe entirely so it doesn't render a broken black box.
      // We will still show the credit bar elsewhere, but do not render bad iframes.
      if (!v.ok) {
        if (debug) {
          return `<!-- getty_invalid_iframe_src: ${src} | reason=${(v as any).reason} etLen=${(v as any).etLen ?? ""} sigLen=${(v as any).sigLen ?? ""} -->`;
        }
        return `<!-- getty_invalid_iframe_removed reason=${(v as any).reason} -->`;
      }

      // Valid: keep EXACT src, no other changes.
      return `<iframe${pre}src="${src}"${post}>`;
    }
  );

  if (debug && firstGettySrc) {
    return `<!-- getty_first_iframe_src: ${firstGettySrc} -->\n${out}`;
  }
  return out;
}
