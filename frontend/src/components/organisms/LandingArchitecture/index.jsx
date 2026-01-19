import React from "react";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

const parts = [
  { title: "Frontend", desc: "React + MUI UI, upload wizard, dataset view, analysis visualizations." },
  { title: "Backend", desc: "Node.js orchestrates jobs, stores configs, and triggers the R engine." },
  { title: "R Engine", desc: "Plumber API executes deterministic preprocessing + optional correlation." },
  { title: "Storage", desc: "Redis caching + PostgreSQL persistence for summaries and metadata." },
];

export default function LandingArchitecture() {
  return (
    <Box sx={{ py: { xs: 5, md: 7 } }}>
      <FlexBox sx={{ display: "flex", maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, flexDirection: "column", gap: 2.5 }}>
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            System architecture
          </Typography>
          <Typography variant="body2" color="textSecondary">
            A clean separation between UI, orchestration, processing, and persistence.
          </Typography>
        </FlexBox>

        <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {parts.map((p) => (
            <SurfaceCard key={p.title} sx={{ p: 2.25, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                {p.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {p.desc}
              </Typography>
            </SurfaceCard>
          ))}
        </FlexBox>
      </FlexBox>
    </Box>
  );
}
