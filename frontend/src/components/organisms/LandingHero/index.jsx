import React from "react";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Button from "../../atoms/CustomButton";
import SurfaceCard from "../../atoms/SurfaceCard";
import LogoMark from "../../atoms/LogoMark";
import Logo from "../../atoms/Logo";
import LandingSignupButton from "../../atoms/LandingSignupButton";

function PreviewCard({ title, lines }) {
  return (
    <SurfaceCard
      sx={{
        p: 2,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>

      <FlexBox sx={{ flexDirection: "column", gap: 0.75 }}>
        {lines.map((t, idx) => (
          <Typography
            key={idx}
            variant="caption"
            color="textSecondary"
            sx={{
              fontFamily: "monospace",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={t}
          >
            {t}
          </Typography>
        ))}
      </FlexBox>
    </SurfaceCard>
  );
}

export default function LandingHero() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        py: { xs: 5, md: 8 },
        mb: { xs: 2, md: 3 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <FlexBox
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
          gap: { xs: 3, md: 4 },
          alignItems: "start",
        }}
      >
        {/* Left: message */}
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Logo />
            <FlexBox sx={{ flexDirection: "column", minWidth: 0 }}>
              <Typography variant="body2" color="textSecondary">
                Deterministic preprocessing & analysis for structured datasets
              </Typography>
            </FlexBox>
          </FlexBox>

          <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 700 }}>
            Upload datasets, select columns, and execute a transparent preprocessing pipeline
            powered by an R engine. Every transformation is logged with reproducible metadata,
            including encoding mappings, scaling statistics, and optional correlation analysis.
          </Typography>

          <FlexBox sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label="Config-driven" />
            <Chip size="small" label="Audit-friendly metadata" />
            <Chip size="small" label="Correlation (Pearson/Spearman)" />
            <Chip size="small" label="CSV / JSON / Excel" />
          </FlexBox>

          <LandingSignupButton />

          <Typography variant="caption" color="textSecondary">
            Built for: students, analysts, and ML practitioners who need repeatable preprocessing.
          </Typography>
        </FlexBox>

        {/* Right: “Product preview” */}
        <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <PreviewCard
            title="Example: preprocessingConfig"
            lines={[
              '{ "version": "1.0", "steps": [ ... ] }',
              "missing_values: numeric_median → types[numeric]",
              "label_cleaning: standard → columns[education, city]",
              "scaling: zscore → columns[age, income]",
              "encoding: auto → columns[color]",
            ]}
          />

          <PreviewCard
            title="Example: metadata"
            lines={[
              "executed_steps: [ ... ]",
              "column_actions: { age: scaling:zscore, ... }",
              "encoding_stats: one_hot_columns + frequency_column",
              "scaling_stats: mean + sd",
              "correlation: matrix + top_pairs (optional)",
            ]}
          />

          <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              What you get
            </Typography>
            <Divider sx={{ my: 1.25 }} />
            <FlexBox sx={{ flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" color="textSecondary">
                • Processed dataset preview (table / CSV / JSON)
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Downloadable outputs (CSV/JSON)
              </Typography>
              <Typography variant="body2" color="textSecondary">
                • Step-by-step traceability for evaluation
              </Typography>
            </FlexBox>
          </SurfaceCard>
        </FlexBox>
      </FlexBox>
    </Box>
  );
}
