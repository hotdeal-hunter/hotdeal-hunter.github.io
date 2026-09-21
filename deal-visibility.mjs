// Held until the exact option's total payable price has been verified.
const heldProducts = new Set(["2669711247", "293907425", "2567944149"]);
export function canDisplayDeal(deal, now = Date.now()) {
  const age = now - Date.parse(deal.observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) return false;
  if (!Number.isFinite(deal.price) || deal.price <= 0) return false;
  const tossId = String(deal.id).match(/^toss:p:(\d+)/)?.[1];
  if (heldProducts.has(tossId)) return false;
  try {
    const url = new URL(deal.url);
    return url.protocol === "https:" && (deal.source === "toss"
      ? url.hostname === "toss.im" && url.pathname.startsWith("/_m/")
      : deal.source === "coupang" && url.hostname === "link.coupang.com");
  } catch { return false; }
}
