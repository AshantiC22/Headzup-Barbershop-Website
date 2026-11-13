// Paints scenes off the main thread. The page hands over its canvases with
// transferControlToOffscreen() and then sends paint requests; strokes are
// composed and drawn here, so a slow phone keeps scrolling while the picture
// goes down. Messages:
//   in   { type: "canvases", paint, fore? }
//   in   { type: "paint", scene: "street" | "sky", key, w, h, dpr, mode, seed, light?, animate, duration }
//   out  { type: "done", key }
import { composeFog, composeSky, composeStreet, drawStrokes, paint } from "./painter";

let canvases = {};
let cancel = () => {};

function paintForeground({ w, h, dpr, mode, seed }) {
  const fore = canvases.fore;
  if (!fore) return;
  fore.width = Math.round(w * dpr);
  fore.height = Math.round(h * dpr);
  const ctx = fore.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  drawStrokes(ctx, composeFog({ w, h, mode, seed }));
}

self.onmessage = ({ data: msg }) => {
  if (msg.type === "canvases") {
    canvases = { paint: msg.paint, fore: msg.fore };
    return;
  }
  if (msg.type !== "paint" || !canvases.paint) return;
  cancel();
  const { scene, key, w, h, dpr, mode, seed, light, animate, duration } = msg;
  const compose = scene === "street" ? composeStreet({ w, h, mode, seed }) : composeSky({ w, h, mode, seed, light });
  cancel = paint(canvases.paint, {
    width: w,
    height: h,
    dpr,
    compose,
    animate,
    duration,
    onDone: () => {
      if (scene === "street") paintForeground({ w, h, dpr, mode, seed });
      self.postMessage({ type: "done", key });
    },
  });
};
