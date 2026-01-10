// src/components/atoms/SectionTitle/index.jsx
import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "../CustomTypography";

const SectionTitle = ({ title, subtitle }) => {
  if (!title) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.25 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
};

SectionTitle.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default SectionTitle;
