// ─────────────────────────────────────────────────────────────────────────────
// Shop facts — one place for everything the site says about HEADZ UP.
// Change an hour, a price or a phone number here and every page follows.
// ─────────────────────────────────────────────────────────────────────────────

export const SHOP = {
  name: "Headz Up",
  legalName: "HEADZ UP Barbershop",
  street: "2509 W 4th St",
  city: "Hattiesburg",
  region: "MS",
  zip: "39401",
  phone: "+16012065206",
  phoneDisplay: "(601) 206-5206",
  email: "headzupbarbershop@headzupp.com",
  timezone: "America/Chicago",
  mapsLink: "https://maps.google.com/?q=2509+W+4th+St+Hattiesburg+MS+39401",
  mapsEmbed: "https://www.google.com/maps?q=2509+W+4th+St,+Hattiesburg,+MS+39401&output=embed",
};

export const ADDRESS_LINE = `${SHOP.street}, ${SHOP.city}, ${SHOP.region} ${SHOP.zip}`;

// Day index follows JS getDay(): 0 = Sunday … 6 = Saturday. Times are 24h, Central.
export const HOURS = [
  { day: 0, label: "Sunday",    open: null,    close: null },
  { day: 1, label: "Monday",    open: "09:00", close: "18:00" },
  { day: 2, label: "Tuesday",   open: "09:00", close: "18:00" },
  { day: 3, label: "Wednesday", open: "09:00", close: "18:00" },
  { day: 4, label: "Thursday",  open: "09:00", close: "18:00" },
  { day: 5, label: "Friday",    open: "09:00", close: "18:00" },
  { day: 6, label: "Saturday",  open: "09:00", close: "16:00" },
];

// Fallback menu for the public pages (the API's service list needs a login).
// Descriptions are matched to live services by name on the booking page too.
export const SERVICES = [
  { name: "Haircut & Shave",      price: 35, minutes: 30, group: "cuts",   popular: true },
  { name: "Haircut",              price: 30, minutes: 30, group: "cuts" },
  { name: "Senior Cut and Shave", price: 30, minutes: 30, group: "cuts" },
  { name: "Senior Cut",           price: 25, minutes: 30, group: "cuts" },
  { name: "Kids Cutz (1–12)",     price: 25, minutes: 30, group: "cuts" },
  { name: "Line and Shave",       price: 25, minutes: 30, group: "lines" },
  { name: "Line",                 price: 20, minutes: 15, group: "lines" },
  { name: "Kids Line",            price: 15, minutes: 30, group: "lines" },
  { name: "Senior Line",          price: 15, minutes: 30, group: "lines" },
  { name: "Beard Trim",           price: 20, minutes: 15, group: "beard" },
  { name: "Shave",                price: 20, minutes: 30, group: "beard" },
];

export const SERVICE_GROUPS = [
  { id: "cuts",  title: "Full cuts",          note: "Clippers, shears and a finished edge." },
  { id: "lines", title: "Lineups",            note: "Just the edge, sharpened." },
  { id: "beard", title: "Beard and shave",    note: "Hot towel, warm lather, steady razor." },
];

const DESCRIPTIONS = [
  [/haircut\s*&\s*shave|haircut and shave/i, "The full sitting: cut, edge and a hot-lather shave."],
  [/senior cut and shave|senior cut & shave/i, "Cut and shave for our elders, at a gentler price."],
  [/senior cut/i,  "A clean, classic cut for our elders."],
  [/kids? cut/i,   "Ages 1 to 12. Patient hands, no rushing."],
  [/line and shave|line & shave/i, "A crisp edge-up plus a hot-lather shave."],
  [/kids? line/i,  "Edge-up for the little ones."],
  [/senior line/i, "Edge-up of the hairline and beard line."],
  [/^line$|lineup|edge/i, "Hairline, temples and nape, made sharp."],
  [/beard/i,       "Shaped, lined and balanced to your face."],
  [/shave/i,       "Hot towel, warm lather, straight razor."],
  [/haircut|cut/i, "Clipper and shear work, finished with a clean edge."],
];

export function describeService(name = "") {
  const hit = DESCRIPTIONS.find(([re]) => re.test(name.trim()));
  return hit ? hit[1] : "";
}

export function groupForService(name = "") {
  const n = name.toLowerCase();
  if (/beard|^shave$/.test(n.trim())) return "beard";
  if (/line/.test(n) && !/cut/.test(n)) return "lines";
  return "cuts";
}

export const REVIEWS = [
  { quote: "This man is an amazing barber with great energy. Most importantly the cuts are fire.", name: "Ronnie E.", city: "Hattiesburg" },
  { quote: "Best fade in Hattiesburg, hands down. I drive 40 minutes just to sit in that chair.", name: "Marcus T.", city: "Laurel" },
  { quote: "Came in first time, walked out looking like a new man. The lineup was immaculate.", name: "DeShawn K.", city: "Hattiesburg" },
  { quote: "My son has been going here since he was 3. Fantastic with kids and the cut is always right.", name: "Tanya W.", city: "Hattiesburg" },
];

// Shop photos, already rotated upright and sized for phones.
export const GALLERY = [
  { id: 1, src: "/gallery/cut-02.jpg", webp: "/gallery/cut-02.webp", title: "Silver, squared away", medium: "Cut and beard sculpt", tag: "cuts",   w: 1050, h: 1400 },
  { id: 2, src: "/gallery/cut-01.jpg", webp: "/gallery/cut-01.webp", title: "Mid-trim",             medium: "Beard work in progress", tag: "beards", w: 1050, h: 1400 },
  { id: 3, src: "/gallery/cut-04.jpg", webp: "/gallery/cut-04.webp", title: "Lather lines",         medium: "Lineup and shave prep", tag: "shaves", w: 1050, h: 1400 },
  { id: 4, src: "/gallery/cut-03.jpg", webp: "/gallery/cut-03.webp", title: "Front and center",     medium: "Finished cut and beard", tag: "cuts",   w: 1050, h: 1400 },
  { id: 5, src: "/gallery/cut-05.jpg", webp: "/gallery/cut-05.webp", title: "In the chair",         medium: "Hot-lather shave", tag: "shaves", w: 1050, h: 1400 },
];

export const GALLERY_FILTERS = [
  { id: "all",    label: "Everything" },
  { id: "cuts",   label: "Cuts" },
  { id: "beards", label: "Beards" },
  { id: "shaves", label: "Shaves" },
];
