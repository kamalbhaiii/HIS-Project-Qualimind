// src/components/molecules/DashboardSectionHeader/index.jsx
// OPTIONAL UPDATE (only if you want rightSlot support; otherwise ignore this file).
// This makes the page header more "dashboard-like" without changing your pages.
import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "../../atoms/CustomTypography";

const DashboardSectionHeader = ({ title, subtitle, rightSlot }) => {
  return (
    <Box
      sx={{
        mb: 2,
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25 }}>
          {subtitle}
        </Typography>
      </Box>

      {rightSlot ? <Box sx={{ flexShrink: 0 }}>{rightSlot}</Box> : null}
    </Box>
  );
};

DashboardSectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  rightSlot: PropTypes.node,
};

DashboardSectionHeader.defaultProps = {
  subtitle: "",
  rightSlot: null,
};

export default DashboardSectionHeader;
