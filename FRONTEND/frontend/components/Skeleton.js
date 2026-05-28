"use client";
// ── Skeleton loader components ─────────────────────────────────────────────────
// Drop these in anywhere data is loading to avoid blank/janky screens

const MONO = { fontFamily:"'DM Mono',monospace" };

// Single skeleton line
export function SkeletonLine({ width = "100%", height = 14, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
      ...style,
    }}/>
  );
}

// Appointment card skeleton
export function SkeletonApptCard() {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", borderRadius:16,
      border:"1px solid rgba(255,255,255,0.08)", padding:"16px 18px", overflow:"hidden" }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:44, borderRadius:10,
          background:"linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
          backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite", flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <SkeletonLine width="60%" height={13} style={{ marginBottom:8 }}/>
          <SkeletonLine width="40%" height={10}/>
        </div>
        <SkeletonLine width={70} height={24} radius={20}/>
      </div>
    </div>
  );
}

// Stat card skeleton
export function SkeletonStat() {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", borderRadius:16,
      border:"1px solid rgba(255,255,255,0.08)", padding:"18px 20px", flex:1, minWidth:120 }}>
      <SkeletonLine width="50%" height={8} style={{ marginBottom:10 }}/>
      <SkeletonLine width="40%" height={24}/>
    </div>
  );
}

// Dashboard skeleton — full page
export function DashboardSkeleton() {
  return (
    <div style={{ padding:"28px", maxWidth:720, margin:"0 auto" }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      {/* Stats row */}
      <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
        {[1,2,3].map(i => <SkeletonStat key={i}/>)}
      </div>
      {/* Cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3,4].map(i => <SkeletonApptCard key={i}/>)}
      </div>
    </div>
  );
}

// Barber schedule skeleton
export function ScheduleSkeleton() {
  return (
    <div>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
        {[1,2,3].map(i => <SkeletonStat key={i}/>)}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3,4,5].map(i => <SkeletonApptCard key={i}/>)}
      </div>
    </div>
  );
}

// Booking page skeleton
export function BookingSkeleton() {
  return (
    <div style={{ padding:"32px 20px", maxWidth:640, margin:"0 auto" }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      <SkeletonLine width="60%" height={20} style={{ marginBottom:8 }}/>
      <SkeletonLine width="40%" height={12} style={{ marginBottom:28 }}/>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ padding:"18px", background:"rgba(255,255,255,0.04)",
            borderRadius:16, border:"1px solid rgba(255,255,255,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ flex:1 }}>
              <SkeletonLine width="50%" height={12} style={{ marginBottom:8 }}/>
              <SkeletonLine width="30%" height={10}/>
            </div>
            <SkeletonLine width={50} height={20}/>
          </div>
        ))}
      </div>
    </div>
  );
}
