"use client";
// A template remounts on every navigation (a layout doesn't), which makes it
// the place to fade a new page in. The first page of a visit doesn't fade:
// it has its own entrance, and an opacity animation would hold back the
// largest paint for no reason.
import { useEffect, useState } from "react";

let hydrated = false;

export default function Template({ children }) {
  const [fade] = useState(() => hydrated);
  useEffect(() => {
    hydrated = true;
  }, []);
  return <div className={fade ? "route-in" : undefined}>{children}</div>;
}
