import React from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import SurfaceCard from "../../atoms/SurfaceCard";
import LandingSignupButton from "../../atoms/LandingSignupButton";

export default function LandingCTA() {
  const navigate = useNavigate();

  return (
    <Box sx={{ py: { xs: 6, md: 9 } }}>
      <FlexBox sx={{ display: "flex", maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
        <SurfaceCard
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 2,
            width: "100%",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
            gap: 5,
            alignItems: "center",
          }}
        >
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Start with a dataset and keep your preprocessing auditable.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Upload a small CSV first, validate the pipeline output, then scale up to larger datasets.
            </Typography>
          </FlexBox>

          <LandingSignupButton />
        </SurfaceCard>
      </FlexBox>
    </Box>
  );
}
