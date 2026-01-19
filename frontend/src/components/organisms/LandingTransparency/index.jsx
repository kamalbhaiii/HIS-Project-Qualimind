import React from "react";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

export default function LandingTransparency() {
  return (
    <Box sx={{ py: { xs: 5, md: 7 } }}>
      <FlexBox sx={{ display: "flex", maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, flexDirection: "column", gap: 2.5 }}>
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Transparency & reproducibility
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Designed for review: every run records what happened, where, and why.
          </Typography>
        </FlexBox>

        <FlexBox sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
          <SurfaceCard sx={{ p: 2.25, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              Executed steps
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Ordered list of applied transformations, plus warnings for skipped steps.
            </Typography>
          </SurfaceCard>

          <SurfaceCard sx={{ p: 2.25, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              Column actions
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Per-column trace of applied methods (e.g., scaling:zscore, encoding:one_hot+frequency).
            </Typography>
          </SurfaceCard>

          <SurfaceCard sx={{ p: 2.25, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
              Stats & mappings
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Scaling stats, encoding stats, and parameters recorded for downstream interpretation.
            </Typography>
          </SurfaceCard>
        </FlexBox>
      </FlexBox>
    </Box>
  );
}
