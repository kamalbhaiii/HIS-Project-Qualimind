import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, alpha } from "@mui/material/styles";

const DashboardStatsOverview = ({ stats }) => {
  const theme = useTheme();

  const {
    processedDatasets = 0,
    runningJobs = 0,
    failedJobs24h = 0,
    pendingJobs = 0,
  } = stats || {};

  const cards = [
    {
      title: "Processed datasets",
      value: processedDatasets,
      caption: "Total successfully processed",
    },
    { title: "Running jobs", value: runningJobs, caption: "Currently in progress" },
    { title: "Pending jobs (24h)", value: pendingJobs, caption: "Waiting to process" },
    { title: "Failed jobs (24h)", value: failedJobs24h, caption: "Recent failures" },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        py: { xs: 2, sm: 2.25, lg: 2.5 },
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            m: 0,
            fontWeight: 700,
            fontSize: "clamp(18px, 2.2vw, 24px)",
            lineHeight: 1.2,
            wordBreak: "break-word",
          }}
        >
          Overview
        </Typography>
        <Typography
          variant="body2"
          sx={{
            mt: 0.75,
            color: "text.secondary",
            fontSize: "clamp(12px, 1.4vw, 14px)",
            lineHeight: 1.4,
          }}
        >
          High-level snapshot of your preprocessing activity
        </Typography>
      </Box>

      {/* Grid */}
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: { xs: 1.75, sm: 2, lg: 2.5 },
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {cards.map((c) => (
          <Box
            key={c.title}
            sx={{
              p: { xs: 2, sm: 2.25, lg: 2.5 },
              borderRadius: 3,
              minWidth: 0,
              boxSizing: "border-box",

              // Theme-aware card surface
              backgroundColor: "background.paper",
              border: (t) => `1px solid ${t.palette.divider}`,

              // Theme-aware shadow (subtle in light, softer in dark)
              boxShadow:
                theme.palette.mode === "dark"
                  ? `0px 10px 30px ${alpha("#000", 0.35)}`
                  : `0px 8px 22px ${alpha("#000", 0.10)}`,

              transition: theme.transitions.create(["transform", "box-shadow", "border-color"], {
                duration: theme.transitions.duration.short,
              }),

              "&:hover": {
                transform: "translateY(-2px)",
                borderColor: (t) => alpha(t.palette.primary.main, 0.35),
                boxShadow:
                  theme.palette.mode === "dark"
                    ? `0px 14px 42px ${alpha("#000", 0.45)}`
                    : `0px 14px 34px ${alpha("#000", 0.14)}`,
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                m: 0,
                color: "text.secondary",
                fontSize: "clamp(13px, 1.6vw, 16px)",
                fontWeight: 600,
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={c.title}
            >
              {c.title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                my: 1.25,
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 800,
                lineHeight: 1.15,
                overflowWrap: "anywhere",
                color: "text.primary",
              }}
            >
              {c.value}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "clamp(11px, 1.2vw, 13px)",
                lineHeight: 1.35,
                overflowWrap: "anywhere",
              }}
            >
              {c.caption}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

DashboardStatsOverview.propTypes = {
  stats: PropTypes.shape({
    processedDatasets: PropTypes.number,
    runningJobs: PropTypes.number,
    failedJobs24h: PropTypes.number,
    pendingJobs: PropTypes.number,
  }),
};

DashboardStatsOverview.defaultProps = {
  stats: {
    processedDatasets: 0,
    runningJobs: 0,
    failedJobs24h: 0,
    pendingJobs: 0,
  },
};

export default DashboardStatsOverview;
