"use client";
// Services as a rack of tools: every service is a slot with its tools and
// price, grouped by kind. Picking one shows what it is, what it costs and how
// long it takes, with a button to book it. The whole rack is one radio group,
// so it's a single Tab stop and the arrow keys move through it.
import { useRef, useState } from "react";
import Link from "next/link";
import { ToolIcon, toolsForService } from "@/components/art/ToolIcons";
import { arrowSelect, rovingIndex } from "@/components/ui/roving";
import { SERVICES, SERVICE_GROUPS, describeService } from "@/lib/shop";
import s from "./ToolRack.module.css";

const ORDER = SERVICE_GROUPS.flatMap((g) => SERVICES.filter((x) => x.group === g.id).map((x) => x.name));
const byName = (name) => SERVICES.find((x) => x.name === name);

export default function ToolRack() {
  const [picked, setPicked] = useState(SERVICES.find((x) => x.popular)?.name || ORDER[0]);
  const detail = useRef(null);
  const svc = byName(picked);
  const group = SERVICE_GROUPS.find((g) => g.id === svc.group);

  const pick = (name) => {
    setPicked(name);
    // On phones the details sit under the rack; bring them up if they're off-screen.
    const el = detail.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight - 120) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" });
    }
  };

  return (
    <div className={s.rack}>
      <div role="radiogroup" aria-label="Services" className={s.groups}
        onKeyDown={(e) => arrowSelect(e, ORDER, picked, setPicked)}>
        {SERVICE_GROUPS.map((g) => (
          <div key={g.id} className={s.group}>
            <p className={s.groupName}>{g.title}</p>
            <div className={s.slots}>
              {SERVICES.filter((x) => x.group === g.id).map((x) => (
                <button key={x.name} type="button" role="radio" aria-checked={picked === x.name}
                  tabIndex={rovingIndex(x.name, picked, ORDER)} className={s.slot}
                  aria-label={`${x.name}, $${x.price}, ${x.minutes} minutes`} onClick={() => pick(x.name)}>
                  <span className={s.price}>${x.price}</span>
                  <ToolIcon tools={toolsForService(x.name)} size={52} className={s.icon} />
                  <span className={s.name}>{x.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <article ref={detail} className={s.detail} aria-labelledby="rack-title">
        <ToolIcon tools={toolsForService(svc.name)} size={132} className={s.detailIcon} />
        <h3 id="rack-title" className={s.detailName} aria-live="polite">{svc.name}</h3>
        {svc.popular && <p className={`chip chip-warn chip-plain ${s.badge}`}>Most booked</p>}
        <dl className={s.stats}>
          <div><dt>Price</dt><dd className="price">${svc.price}</dd></div>
          <div><dt>In the chair</dt><dd>{svc.minutes} min</dd></div>
        </dl>
        <p className={`lore ${s.lore}`}>{describeService(svc.name)} {group?.note}</p>
        <Link href={`/book?service=${encodeURIComponent(svc.name)}`} className="btn btn-primary btn-lg btn-block">
          Book {svc.name}
        </Link>
      </article>
    </div>
  );
}
