// The API origin, with no trailing slash and no /api. NEXT_PUBLIC_API_URL is
// accepted in either form, so a value pasted as ".../api" or with a stray
// space doesn't turn every request into /api/api/.
export const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "https://api.headzupp.com")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
