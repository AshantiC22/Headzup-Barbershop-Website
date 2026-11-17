# headzup-web

The public site, booking flow, client account and barber dashboard for
HEADZ UP Barbershop (2509 W 4th St, Hattiesburg). Next.js App Router talking
to the Django API in `../../BACKEND`.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: date/time rules, shop data, next-open-chair search, wordmark fade
npm run lint
npm run format     # Prettier; CI runs format:check
npm run build
```

| Variable | Default | |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.headzupp.com` | API origin. A trailing `/api` or slash is stripped (`lib/config.js`) |
| `NEXT_PUBLIC_ONLINE_PAYMENTS` | off | `on` brings back Stripe card deposits. Off, the shop takes cash and Cash App in person and nothing offers a card. The API needs `ONLINE_PAYMENTS=on` too |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | none | Web push key; when unset it's fetched from `push/vapid-key/` |

## Layout

```
app/                  one folder per route; page-level CSS modules sit beside the page
components/
  site/               nav, footer, flow and app headers, Wordmark, NextChair (home)
  booking/            calendar, slot picker, work-week editor
  barber/             dashboard tabs, grouped by job (schedule, people, setup, money)
  auth/               shared form pieces and the password recovery flow
  ui/                 modal, toasts, notices, icons, motion helpers
lib/
  api.js              axios client: token refresh, short GET cache
  auth.js             session helpers, safe ?next= redirects
  time.js             all date/time handling (shop runs on America/Chicago)
  shop.js             address, hours, services, reviews, gallery: the facts that rarely change
  nextChair.js        finds the earliest open time across every barber's book
```

## The look

Built from the haircut. A skin fade runs from full hair to bare skin without
a line you can point to, and the site does the same thing between sections:
`public/fade.webp` is a mask drawn hair by hair, and `.fade-edge` hangs it off
the dark band (the menu, the footer) so the band thins out into the page. Where
a fade needs a hard line, a lineup gives one: every button, panel and photo
has the same corner taken off (`--cut`), like the edge at the temple. Buttons
draw that shape in `::before` and, on hover or focus, a thin yellow glint runs
along the cut.

The wordmark (`components/site/Wordmark.js`) fades too: each letter of HEADZ UP
steps down in weight and out in width, from a heavy, narrow H to a light, wide
P. On the home page it comes in once behind a yellow clipper edge; that's the
only entrance animation on the site.

Day is the default: paper, clipper-steel ink, and one heads-up yellow
reserved for what's happening now (the next open chair, the time you picked,
today in the calendar). Night is the same shop after close. Colors are tokens
on `:root` and `:root[data-theme="dark"]` in `app/globals.css`; `.band` swaps
them so anything placed on a band just works. An inline script in
`app/layout.tsx` sets `data-theme` before first paint: the visitor's choice
from `localStorage.headzup_theme`, else their system setting, else Day.

Type is Anybody (headlines, buttons, prices; its width axis runs 50% to 150%)
and Atkinson Hyperlegible Next for everything you read, which was drawn for
low vision and suits a chair that runs from kids to seniors. The latin subsets
live in `app/fonts/` (OFL, licenses alongside) and load through
`next/font/local`, which preloads them and sizes a fallback face to match.

Spacing between blocks uses one scale (4, 8, 12, 16, 20, 24, 32, 40 px)
through the `mt-*`/`mb-*` classes at the end of `globals.css`.

## The next open chair

The top of the home page answers "can I get in today?". `lib/nextChair.js`
asks the public `available-slots/` endpoint for each barber, today first, and
walks forward a day at a time (skipping Sundays) until someone has an opening.
Every request has a 6-second timeout. Each outcome has its own screen: still
checking (and a "slow to answer" line after 3.5 s), found (one yellow button
that books it, plus a few alternatives), the week is full (waitlist), no
barbers online, and the book didn't load (call the shop, try again). The
button links to `/book?barber=&date=&time=`; the booking page holds that time
while you pick a service, re-checks it, and sends you back to the time step if
someone took it first.

The booking page keeps everything picked in `sessionStorage`, so a refresh
lands on the same step with the same choices. A draft is only restored when
the address matches the one it was saved from; a new link starts fresh.

## Shop hours

Nothing in the frontend hard-codes the hours. Barbers set the shop's week in
the dashboard (Hours tab, "Shop hours"), which saves the whole week at once to
`PUT /api/shop/hours/`. `GET /api/shop/hours/` is public.

- `app/layout.tsx` fetches the week on the server (cached five minutes) so the
  first HTML and the search-engine data already have it.
- `components/ShopHours.js` holds it for the page, asks the API once more in
  the browser, and takes a freshly saved week from the dashboard so the
  footer and home page update without a reload. Read it with
  `useShopHours()`; pass `hours` to `shopStatus(hours)`.
- `lib/hours.js` converts between the API's Monday-first days and `getDay()`
  order. `DEFAULT_HOURS` there is only what shows if the API can't be reached.

The API enforces the hours too: no open times on a day the shop is closed,
each barber's own hours are cut to the shop's, and a booking outside them is
refused with the reason.

## Motion

Durations and easings are tokens in `globals.css` (`--dur-1/2/3`, `--ease`,
`--ease-in`). Things arrive on `--ease` and leave faster on `--ease-in`.
React removes an element as soon as its condition is false, so dialogs,
sheets, toasts and the lightbox use the helpers in `components/ui/motion.js`
(`usePresence`, `Present`) to stay mounted for the exit, and CSS animates
`[data-state="closing"]`. Expanding rows use `<Collapse>`, which animates
height with the `grid-template-rows: 0fr → 1fr` trick and makes closed
content inert. `app/template.js` fades each new page in after client-side
navigation, so internal links should be `next/link`, not `<a>`.

`prefers-reduced-motion` turns all of it off, including the wordmark's
entrance.

When a page throws, `app/error.js` says so in the shop's voice with a retry
and the phone number; `app/global-error.js` covers the root layout failing.

## Things that are easy to get wrong

- **Dates.** Use `lib/time.js`. `new Date().toISOString()` gives tomorrow's
  date after 6 or 7 pm in Mississippi. Open/closed is computed in shop time,
  not the visitor's.
- **Times from the API** come as `HH:MM:SS` or `h:mm AM`. `fmtTime` and
  `toMinutes` handle both.
- **Deposit return URL.** The API now URL-encodes the names it sends back
  after a Stripe deposit; older links split `Haircut & Shave` at the `&`.
  `booking-confirmed` reads the raw query string so both kinds work.
- **`useSearchParams`** opts everything up to the nearest `<Suspense>` out of
  prerendering. Give that boundary a real fallback (the page's own loading
  view) and keep static shells outside it, or the page ships as empty HTML.
- **Overlays** (dialogs, toasts, the lightbox) go through `Portal` in
  `components/ui/Feedback.js`. Rendered in place, an animated or transformed
  ancestor traps them under the sticky header. Entrance animations fill
  `backwards` for the same reason.
- **Service worker.** `public/sw.js` caches by `CACHE_VERSION`. Bump it when
  shipping changes to cached routes or the offline page.
