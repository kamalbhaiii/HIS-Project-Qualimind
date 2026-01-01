import React from "react";

import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import FunctionsOutlinedIcon from "@mui/icons-material/FunctionsOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import CompressOutlinedIcon from "@mui/icons-material/CompressOutlined";

const items = [
  { icon: <TuneOutlinedIcon />, title: "Config-driven preprocessing", desc: "Ordered steps with column/type scoping and parameters." },
  { icon: <CleaningServicesOutlinedIcon />, title: "Label cleaning", desc: "Standardize categorical labels for reliable encoding." },
  { icon: <FunctionsOutlinedIcon />, title: "Missing value imputation", desc: "Mean/median/constant for numeric; mode/unknown for categorical." },
  { icon: <ScaleOutlinedIcon />, title: "Scaling", desc: "Z-score and min-max normalization with stored statistics." },
  { icon: <CompressOutlinedIcon />, title: "Reduce cardinality", desc: "Rare categories mapped to “other” with thresholds logged." },
  { icon: <CategoryOutlinedIcon />, title: "Encoding", desc: "Auto strategy: one-hot + frequency (or label + frequency)." },
];

export default function LandingFeatures() {
  return (
    <Box sx={{ py: { xs: 5, md: 7 } }}>
      <FlexBox sx={{ display:"flex", maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, flexDirection: "column", gap: 2.5 }}>
        <FlexBox sx={{ display:"flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Preprocessing capabilities
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Methods are designed for transparency and reproducibility.
          </Typography>
        </FlexBox>

        <FlexBox
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {items.map((it) => (
            <SurfaceCard key={it.title} sx={{ p: 2.25, borderRadius: 2 }}>
              <FlexBox sx={{ display:"flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "action.hover",
                  }}
                >
                  {it.icon}
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {it.title}
                </Typography>
              </FlexBox>

              <Typography variant="body2" color="textSecondary">
                {it.desc}
              </Typography>
            </SurfaceCard>
          ))}
        </FlexBox>
      </FlexBox>
    </Box>
  );
}
