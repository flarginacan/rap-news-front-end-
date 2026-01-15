type Props = {
  hasGetty?: boolean;
  creditText?: string;
  assetUrl?: string;
  assetId?: string;
};

export default function GettyCreditBar({ hasGetty, creditText, assetUrl, assetId }: Props) {
  if (!hasGetty) return null;

  const normalized = (creditText || "").replace(/\s+/g, " ").trim();

  // If we have a real credit line including Getty, use it, else fallback to "Getty Images"
  const text =
    normalized && /getty images/i.test(normalized)
      ? normalized
      : "Getty Images";

  const href =
    assetUrl ||
    (assetId ? `https://www.gettyimages.com/detail/${assetId}` : "");

  return (
    <div
      className="getty-credit"
      data-getty-credit="true"
      role="note"
      aria-label="Getty image credit"
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </div>
  );
}
