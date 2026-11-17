"use client";
// Last resort: the root layout itself failed, so none of the site's styles or
// fonts are loaded. Plain HTML with the colors written in.
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f1f2ee",
          color: "#1a1f24",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.1, margin: 0 }}>The site didn&apos;t load.</h1>
          <p style={{ color: "#444c54", lineHeight: 1.55, margin: "14px 0 22px" }}>
            Try again in a moment. To book now, call HEADZ UP at (601) 206-5206.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              font: "inherit",
              fontWeight: 700,
              padding: "14px 24px",
              border: 0,
              background: "#1a1f24",
              color: "#f1f2ee",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <p style={{ marginTop: 14 }}>
            <a href="tel:+16012065206" style={{ color: "#1a1f24" }}>
              Call (601) 206-5206
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
