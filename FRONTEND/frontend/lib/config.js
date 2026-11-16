// The API origin, with no trailing slash and no /api. NEXT_PUBLIC_API_URL is
// accepted in either form, so a value pasted as ".../api" or with a stray
// space doesn't turn every request into /api/api/.
export const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

// Card deposits through Stripe. Off: the shop takes cash and Cash App in
// person, and nothing on the site offers to take a card. To bring deposits
// back, set NEXT_PUBLIC_ONLINE_PAYMENTS=on here and ONLINE_PAYMENTS=on on the
// API, then redeploy both.
export const ONLINE_PAYMENTS = (process.env.NEXT_PUBLIC_ONLINE_PAYMENTS || "").trim().toLowerCase() === "on";

/** A barber's $cashtag, normalized, or "" if they haven't set one. */
export function cashtag(tag) {
  const t = (tag || "").trim().replace(/^\$+/, "");
  return t ? `$${t}` : "";
}

/** Opens Cash App to pay `tag`, with the amount filled in when there is one. */
export function cashAppLink(tag, amount) {
  const t = cashtag(tag);
  if (!t) return "";
  const n = parseFloat(amount);
  return `https://cash.app/${t}${n > 0 ? `/${n.toFixed(2).replace(/\.00$/, "")}` : ""}`;
}
