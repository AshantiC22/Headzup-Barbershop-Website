"use client";
// Shop hours for every component on the page. The root layout fetches them on
// the server (so the first HTML already has the right week) and passes them
// in; the browser then asks once more for the latest, and the barber
// dashboard pushes a saved week straight in so the change shows everywhere.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "@/lib/api";
import { DEFAULT_HOURS, fromApi, metaFromApi } from "@/lib/hours";

const ShopHoursContext = createContext({
  hours: DEFAULT_HOURS,
  meta: null,
  live: false,
  apply: () => false,
});

export function ShopHoursProvider({ initial, children }) {
  const [state, setState] = useState(() => {
    const hours = fromApi(initial);
    return { hours: hours || DEFAULT_HOURS, meta: metaFromApi(initial), live: !!hours };
  });

  const apply = useCallback((data) => {
    const hours = fromApi(data);
    if (!hours) return false;
    setState({ hours, meta: metaFromApi(data), live: true });
    return true;
  }, []);

  useEffect(() => {
    let gone = false;
    API.get("shop/hours/")
      .then((r) => {
        if (!gone) apply(r.data);
      })
      .catch(() => {}); // keep the server's copy (or the fallback); the footer never goes blank
    return () => {
      gone = true;
    };
  }, [apply]);

  const value = useMemo(() => ({ ...state, apply }), [state, apply]);
  return <ShopHoursContext.Provider value={value}>{children}</ShopHoursContext.Provider>;
}

/** { hours, meta, live, apply }: hours is indexed by getDay() (0 = Sunday). */
export const useShopHours = () => useContext(ShopHoursContext);
