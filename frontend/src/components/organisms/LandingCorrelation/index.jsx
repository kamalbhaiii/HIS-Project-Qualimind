import React from "react";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

export default function LandingCorrelation() {
  return (
    <Box sx={{ py: { xs: 5, md: 7 } }}>
      <FlexBox sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <SurfaceCard sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.75 }}>
            Correlation analysis (optional)
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Run Pearson or Spearman correlation on selected numeric variables. The pipeline reports the used columns,
            excluded columns (missing/non-numeric/constant), correlation matrix, and strongest pairs.
          </Typography>
        </SurfaceCard>

        <SurfaceCard sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            What’s returned in metadata
          </Typography>
          <Typography variant="body2" color="textSecondary">
            • method, enabled, requested_columns, used_columns
            <br />• non_numeric_columns, missing_columns, constant_columns
            <br />• matrix (if enabled) and top_pairs sorted by strength
          </Typography>
        </SurfaceCard>
      </FlexBox>
    </Box>
  );
}
