"use client";

import React from "react";
import LiveFeedWidget from "@/components/live-feed/LiveFeedWidget";

export default function AdminLiveFeedPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto", height: "100%" }}>
      <LiveFeedWidget isStandalone={true} />
    </div>
  );
}
