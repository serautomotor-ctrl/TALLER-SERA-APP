"use client";

import { useState } from "react";

export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 12, background: "var(--color-surface-2)" }} />;
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[active]}
        alt={alt}
        style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12, border: "1px solid var(--color-border)" }}
      />
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {photos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              style={{
                padding: 0,
                border: `2px solid ${i === active ? "var(--color-accent)" : "transparent"}`,
                borderRadius: 8,
                cursor: "pointer",
                background: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
