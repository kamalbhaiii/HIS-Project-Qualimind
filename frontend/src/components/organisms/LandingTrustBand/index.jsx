import React from "react";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

const items = [
  {
    title: "Deterministic execution",
    desc: "Config-driven steps execute in a defined order with consistent outcomes.",
  },
  {
    title: "Metadata-first",
    desc: "Column-level actions, encoding mappings, and scaling statistics are stored.",
  },
  {
    title: "Optional correlation",
    desc: "Pairwise numeric correlation with selected columns and top correlated pairs.",
  },
];

export default function LandingTrustBand() {
  return (
    <Box sx={{ py: { xs: 2, md: 3 } }}>
      <FlexBox
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {items.map((it) => (
          <SurfaceCard key={it.title} sx={{ p: 2.25, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {it.title}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {it.desc}
            </Typography>
          </SurfaceCard>
        ))}
      </FlexBox>
    </Box>
  );
}
