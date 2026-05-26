"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

const SF   = { fontFamily:"'Syncopate',sans-serif" };
const MONO = { fontFamily:"'DM Mono',monospace" };

export default function SMSOptInPage() {
  const router  = useRouter();
  const [phone,   setPhone]   = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    if (!agreed) { setError("Please agree to receive SMS messages"); return; }
    setError(""); setLoading(true);
    try {
      await API.patch("client/update-phone/", { phone: phone.trim() });
      setDone(true);
    } catch(e) {
      setError(e?.response?.data?.error || "Could not save. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#050505", minHeight:"100vh", color:"white",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"24px" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@700&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#050505;}
      `}</style>

      <div style={{ width:"100%", maxWidth:480 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <img src="/logo1.jpg" alt="HEADZ UP Barbershop"
            style={{ height:60, objectFit:"contain" }}/>
        </div>

        {done ? (
          /* Success state */
          <div style={{ background:"#0a0a0a", border:"1px solid rgba(34,197,94,0.3)",
            padding:32, textAlign:"center",
            clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h2 style={{ ...SF, fontSize:14, fontWeight:900, textTransform:"uppercase",
              letterSpacing:"0.05em", marginBottom:12 }}>You&apos;re Subscribed!</h2>
            <p style={{ ...MONO, fontSize:12, color:"#71717a", lineHeight:1.8, marginBottom:24 }}>
              You will now receive appointment confirmations, reminders,
              and updates via SMS. Reply STOP at any time to unsubscribe.
            </p>
            <button onClick={()=>router.push("/dashboard")}
              style={{ padding:"12px 28px", background:"#f59e0b", border:"none",
                color:"black", ...SF, fontSize:8, fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.15em", cursor:"pointer" }}>
              Go to Dashboard →
            </button>
          </div>
        ) : (
          /* Opt-in form */
          <div style={{ background:"#0a0a0a", border:"1px solid rgba(245,158,11,0.2)",
            overflow:"hidden",
            clipPath:"polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))" }}>

            {/* Barber pole top */}
            <div style={{ height:4, background:"repeating-linear-gradient(90deg,#ef4444 0,#ef4444 8px,#fff 8px,#fff 16px,#f59e0b 16px,#f59e0b 24px,#000 24px,#000 32px)" }}/>

            <div style={{ padding:"28px 28px 32px" }}>
              <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.5)",
                letterSpacing:"0.4em", textTransform:"uppercase", marginBottom:12 }}>
                SMS Notifications
              </p>
              <h1 style={{ ...SF, fontSize:18, fontWeight:900, textTransform:"uppercase",
                letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:8 }}>
                Stay in the Loop
              </h1>
              <p style={{ ...MONO, fontSize:12, color:"#71717a", lineHeight:1.8, marginBottom:28 }}>
                Enter your phone number to receive appointment confirmations,
                reminders, and updates from HEADZ UP Barbershop via SMS.
              </p>

              {/* What you'll receive */}
              <div style={{ background:"rgba(245,158,11,0.04)",
                border:"1px solid rgba(245,158,11,0.12)",
                padding:"14px 16px", marginBottom:24 }}>
                <p style={{ ...MONO, fontSize:9, color:"rgba(245,158,11,0.5)",
                  letterSpacing:"0.3em", textTransform:"uppercase", marginBottom:10 }}>
                  You will receive:
                </p>
                {[
                  "📅 Booking confirmations",
                  "⏰ Appointment reminders (24hr & 1hr before)",
                  "✂️ Cut complete & review requests",
                  "❌ Cancellation & reschedule notices",
                ].map((item, i) => (
                  <p key={i} style={{ ...MONO, fontSize:11, color:"#a1a1aa",
                    lineHeight:1.6, marginBottom: i < 3 ? 4 : 0 }}>{item}</p>
                ))}
              </div>

              {/* Phone input */}
              <div style={{ marginBottom:16 }}>
                <label style={{ ...MONO, fontSize:9, color:"#71717a",
                  letterSpacing:"0.3em", textTransform:"uppercase",
                  display:"block", marginBottom:8 }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e=>setPhone(e.target.value)}
                  placeholder="(601) 555-0100"
                  style={{ width:"100%", padding:"12px 16px",
                    background:"#050505", border:"1px solid rgba(255,255,255,0.1)",
                    color:"white", ...MONO, fontSize:14, outline:"none",
                    transition:"border-color 0.2s" }}
                  onFocus={e=>e.target.style.borderColor="#f59e0b"}
                  onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"}
                />
              </div>

              {/* Consent checkbox */}
              <label style={{ display:"flex", gap:12, alignItems:"flex-start",
                cursor:"pointer", marginBottom:24 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e=>setAgreed(e.target.checked)}
                  style={{ marginTop:2, accentColor:"#f59e0b",
                    width:16, height:16, flexShrink:0 }}
                />
                <span style={{ ...MONO, fontSize:11, color:"#a1a1aa", lineHeight:1.7 }}>
                  I agree to receive SMS text messages from HEADZ UP Barbershop
                  at the phone number provided. Message frequency varies.
                  Message &amp; data rates may apply. Reply <strong style={{color:"white"}}>STOP</strong> to
                  unsubscribe at any time. Reply <strong style={{color:"white"}}>HELP</strong> for help.
                </span>
              </label>

              {error && (
                <p style={{ ...MONO, fontSize:11, color:"#f87171",
                  marginBottom:16, padding:"8px 12px",
                  background:"rgba(239,68,68,0.06)",
                  border:"1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !agreed}
                style={{ width:"100%", padding:"14px",
                  background: agreed ? "#f59e0b" : "rgba(245,158,11,0.15)",
                  border:"none", color: agreed ? "black" : "#71717a",
                  ...SF, fontSize:8, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.2em",
                  cursor: agreed ? "pointer" : "not-allowed",
                  transition:"all 0.2s" }}>
                {loading ? "Saving..." : "✓ Subscribe to SMS Updates"}
              </button>

              {/* Legal footer */}
              <div style={{ marginTop:20, paddingTop:16,
                borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ ...MONO, fontSize:10, color:"#3f3f46", lineHeight:1.8 }}>
                  By subscribing you consent to receive recurring automated
                  transactional SMS messages from HEADZ UP Barbershop
                  (2509 W 4th St, Hattiesburg MS 39401) to the number provided.
                  Consent is not a condition of any purchase.
                  View our <a href="/terms" style={{color:"#f59e0b",textDecoration:"none"}}>Terms &amp; Privacy Policy</a>.
                </p>
                <p style={{ ...MONO, fontSize:10, color:"#3f3f46",
                  marginTop:8, lineHeight:1.8 }}>
                  <strong style={{color:"#52525b"}}>STOP</strong> — unsubscribe &nbsp;·&nbsp;
                  <strong style={{color:"#52525b"}}>HELP</strong> — get help &nbsp;·&nbsp;
                  headzupbarbershop@headzupp.com
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
