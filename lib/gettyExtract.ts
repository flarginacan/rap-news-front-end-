import * as cheerio from "cheerio";

export type GettyExtraction = {
  contentWithoutGetty: string;
  gettyEmbedHtml: string;   // embed wrapper / iframe html OR gie-single anchor html
  gettyCreditText: string;  // plain text like "Photo by X/Getty Images"
  gettyAssetUrl: string;    // link to Getty detail page if detectable
  gettyAssetId: string;     // numeric id if detectable
  hasGetty: boolean;
};

const CREDIT_RE = /(getty images|photo by|photo via|photograph by)/i;

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function pickFirstHref($node: cheerio.Cheerio) {
  const a = $node.find("a[href*='gettyimages.com/detail']").first();
  return a.length ? (a.attr("href") || "") : "";
}

function idFromEmbedSrc(src: string) {
  const m = src.match(/\/embed\/(\d+)/);
  return m?.[1] || "";
}

function idFromAnyTextOrHref(s: string) {
  const m = s.match(/(\d{8,})/);
  return m?.[1] || "";
}

export function extractGettyFromWpContent(html: string): GettyExtraction {
  const $ = cheerio.load(html || "", { decodeEntities: true });

  let gettyEmbedHtml = "";
  let gettyCreditText = "";
  let gettyAssetUrl = "";
  let gettyAssetId = "";

  // Prefer "new WP" wrapper format
  const wrap = $(".getty-embed-wrap").first();

  if (wrap.length) {
    gettyEmbedHtml = $.html(wrap);

    // Attempt to detect the asset id from iframe src
    const iframe = wrap.find("iframe[src*='embed.gettyimages.com/embed/']").first();
    const src = iframe.attr("src") || "";
    gettyAssetId = idFromEmbedSrc(src);

    // Credits often appear as the NEXT sibling node after wrap (div/p/etc)
    const next = wrap.next();
    const nextText = normalizeText(next.text() || "");

    const looksLikeCredit =
      next.length &&
      next.is("div, p, span") &&
      CREDIT_RE.test(nextText);

    if (looksLikeCredit) {
      gettyCreditText = nextText;
      gettyAssetUrl = pickFirstHref(next);

      // If still no url/id, try to infer id from href/text
      if (!gettyAssetId) gettyAssetId = idFromAnyTextOrHref(gettyAssetUrl || gettyCreditText || "");
      // Remove the credit node from content too
      next.remove();
    }

    // If no URL but we do have an id, build a stable detail url
    if (!gettyAssetUrl && gettyAssetId) {
      gettyAssetUrl = `https://www.gettyimages.com/detail/${gettyAssetId}`;
    }

    // Remove the embed wrapper from content
    wrap.remove();
  } else {
    // Widget/anchor format (gie-single or any anchor w data-id)
    const gie = $("a.gie-single, a[data-id][href*='gettyimages.com/detail']").first();
    if (gie.length) {
      gettyEmbedHtml = $.html(gie);
      gettyAssetUrl = gie.attr("href") || "";
      gettyAssetId = gie.attr("data-id") || "";
      if (!gettyAssetId) gettyAssetId = idFromAnyTextOrHref(gettyAssetUrl);

      // Rare: nearby credit line
      const parent = gie.parent();
      const next = parent.next();
      const t = normalizeText(next.text() || "");
      if (next.length && CREDIT_RE.test(t)) {
        gettyCreditText = t;
        if (!gettyAssetUrl) gettyAssetUrl = pickFirstHref(next);
        next.remove();
      }

      gie.remove();

      if (!gettyAssetUrl && gettyAssetId) {
        gettyAssetUrl = `https://www.gettyimages.com/detail/${gettyAssetId}`;
      }
    }
  }

  const contentWithoutGetty = $.html();

  const hasGetty = Boolean(gettyEmbedHtml && gettyEmbedHtml.trim().length > 0);

  return {
    contentWithoutGetty,
    gettyEmbedHtml,
    gettyCreditText,
    gettyAssetUrl,
    gettyAssetId,
    hasGetty,
  };
}
