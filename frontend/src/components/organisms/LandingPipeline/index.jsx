import React from "react";
import Box from "@mui/material/Box";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import SurfaceCard from "../../atoms/SurfaceCard";

const steps = [
  { title: "Upload", desc: "CSV/JSON/Excel → normalized CSV pipeline input." },
  { title: "Inspect", desc: "Column selection + type inference preview." },
  { title: "Configure", desc: "Deterministic preprocessingConfig (editable)." },
  { title: "Process", desc: "R engine executes steps and stores metadata." },
  { title: "Analyze", desc: "Optional Pearson/Spearman correlation results." },
  { title: "Export", desc: "Download processed data + traceable metadata." },
];

export default function LandingPipeline() {
  return (
    <Box sx={{ py: { xs: 5, md: 7 } }}>
      <FlexBox sx={{ display: "flex", maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, flexDirection: "column", gap: 2.5 }}>
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Workflow
          </Typography>
          <Typography variant="body2" color="textSecondary">
            A clear sequence from raw upload to processed output and analysis.
          </Typography>
        </FlexBox>

        <FlexBox
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" },
            gap: 2,
          }}
        >
          {steps.map((s, idx) => (
            <SurfaceCard key={s.title} sx={{ p: 2, borderRadius: 2, position: "relative" }}>
              <Typography variant="overline" color="textSecondary">
                Step {idx + 1}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                {s.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {s.desc}
              </Typography>
            </SurfaceCard>
          ))}
        </FlexBox>
      </FlexBox>
    </Box>
  );
}
