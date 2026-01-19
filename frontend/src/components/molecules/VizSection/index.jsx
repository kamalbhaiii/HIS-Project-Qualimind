// src/components/molecules/VizSection/index.jsx
import React from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import ChartCard from "../ChartCard";
import Typography from "../../atoms/CustomTypography";

const compactAccordionSx = {
  "&:before": { display: "none" },
  boxShadow: "none",
  borderRadius: 1.5,
  border: "1px solid rgba(0,0,0,0.08)",
};

const compactSummarySx = {
  minHeight: 40,
  "& .MuiAccordionSummary-content": { my: 0.5 },
};

const VizSection = ({
  visible,
  title,
  subtitle,
  footer,
  loading,
  expanded,
  onToggleExpanded,
  summaryLabel = "Open",
  children,
}) => {
  if (!visible) return null;

  return (
    <ChartCard title={title} subtitle={subtitle} loading={loading} footer={footer}>
      <Accordion expanded={expanded} onChange={onToggleExpanded} disableGutters sx={compactAccordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={compactSummarySx}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>
            {summaryLabel}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ width: "100%" }}>{children}</Box>
        </AccordionDetails>
      </Accordion>
    </ChartCard>
  );
};

VizSection.propTypes = {
  visible: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  footer: PropTypes.string,
  loading: PropTypes.bool,
  expanded: PropTypes.bool,
  onToggleExpanded: PropTypes.func,
  summaryLabel: PropTypes.string,
  children: PropTypes.node,
};

export default VizSection;
