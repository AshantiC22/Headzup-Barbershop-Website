// Paints one photo as an oil sketch, off the main thread.
// The worker fetches and decodes the photo itself: decoding a JPEG through an
// <img> on the main thread was most of the scroll jank on the gallery.
import { paintImage } from "./painter";

self.onmessage = async ({ data }) => {
  const { id, url, width, height, dpr, seed, detail } = data;
  let bitmap;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    bitmap = await createImageBitmap(await res.blob());
  } catch {
    self.postMessage({ id, ok: false });
    return;
  }
  const canvas = new OffscreenCanvas(1, 1);
  let ok = false;
  try {
    ok = paintImage(canvas, bitmap, { width, height, dpr, seed, detail });
  } catch {
    ok = false;
  }
  bitmap.close();
  if (!ok) {
    self.postMessage({ id, ok: false });
    return;
  }
  const result = canvas.transferToImageBitmap();
  self.postMessage({ id, ok: true, result }, [result]);
};
