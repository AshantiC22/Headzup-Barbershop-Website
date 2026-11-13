# headzup-web

The public site, booking flow, client account and barber dashboard for
HEADZ UP Barbershop (2509 W 4th St, Hattiesburg). Next.js App Router talking
to the Django API in `../../BACKEND`.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: date/time rules, shop data, painter determinism
npm run lint
npm run build
```

| Variable | Default | |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.headzupp.com` | API origin, no trailing slash |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | none | Web push key; when unset it's fetched from `push/vapid-key/` |

## Layout

```
app/                  one folder per route; page-level CSS modules sit beside the page
components/
  art/                StreetScene (home hero), PaintedSky, Impression (photo → oil sketch), ToolIcons
  site/               nav, footer, flow and app headers, ToolRack (services)
  booking/            calendar, slot picker, work-week editor
  barber/             dashboard tabs, grouped by job (schedule, people, setup, money)
  auth/               shared form pieces and the password recovery flow
  ui/                 modal, toasts, notices, icons
lib/
  api.js              axios client: token refresh, short GET cache
  auth.js             session helpers, safe ?next= redirects
  time.js             all date/time handling (shop runs on America/Chicago)
  shop.js             address, hours, services, gallery: the facts that rarely change
  painter.js          the generative painting engine
```

## The look

A night street in an old town, river fog, a big moon behind a cathedral
spire, and the shop's barber pole standing in the road like a gas lamp. The
globe on top is lit and the stripes turn only while the shop is open, so the
hero doubles as the open sign. Services hang as a rack of tools, barbers sit
in pointed-arch frames, reviews are cut into stone.

The palette comes from the barber-surgeons the pole is named for: oxblood
for the blood, bone for the bandages, brass for the basin, on wet stone.
Lamplight is the default theme; Daylight is the same street on an overcast
morning.

Everything visual is drawn in `lib/painter.js`; there are no image assets for
the art. A scene function (`composeStreet`, `composeSky`) returns a list of
strokes and `paint()` lays them down. Seeds are fixed, so the same viewport
always gets the same painting (the tests check this). The paint-in animation
runs once per session and never with `prefers-reduced-motion`.

A full-screen painting is tens of thousands of strokes, which is over a second
of main-thread work on a mid-range phone. `components/art/useScenePainter.js`
hands the canvas to `lib/paint.worker.js` with `transferControlToOffscreen()`
so that work happens off the main thread, and falls back to painting in place
on browsers that can't transfer a canvas.

Colors and type are CSS variables in `app/globals.css`, switched by
`<html data-theme>`. Spacing between blocks uses one scale (4, 8, 12, 16, 20,
24, 32, 40 px) through the `mt-*`/`mb-*` classes at the end of that file.
A small inline script in `app/layout.tsx` sets that attribute before first
paint: Lamplight unless `localStorage.headzup_theme` says `light`. Canvas code
reads the palette through `useTheme()`.

Type is Grenze Gotisch (headlines and names), Grenze (italic lore lines and
quotes) and Archivo with its width axis (everything functional, condensed for
prices and numbers), all self-hosted through Fontsource. Grenze Gotisch stops
reading well under about 24px, so `.h3` and `.h4` switch to the roman Grenze.

## Things that are easy to get wrong

- **Dates.** Use `lib/time.js`. `new Date().toISOString()` gives tomorrow's
  date after 6 or 7 pm in Mississippi. Open/closed is computed in shop time,
  not the visitor's.
- **Times from the API** come as `HH:MM:SS` or `h:mm AM`. `fmtTime` and
  `toMinutes` handle both.
- **Deposit return URL.** The API's deposit-success redirect doesn't encode
  the service name, so `Haircut & Shave` arrives split at the `&`.
  `booking-confirmed` reads the raw query string to put it back together.
- **Service worker.** `public/sw.js` caches by `CACHE_VERSION`. Bump it when
  shipping changes to cached routes or the offline page.
