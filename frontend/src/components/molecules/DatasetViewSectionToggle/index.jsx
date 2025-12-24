import React from "react";
import PropTypes from "prop-types";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Box from "@mui/material/Box";

const DatasetViewSectionToggle = ({ value, onChange }) => {
  const handleChange = (e, next) => {
    if (!next) return;
    onChange(next);
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
      <ToggleButtonGroup size="small" exclusive value={value} onChange={handleChange}>
        <ToggleButton value="preview">Preview</ToggleButton>
        <ToggleButton value="visualize">Visualizations</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

DatasetViewSectionToggle.propTypes = {
  value: PropTypes.oneOf(["preview", "visualize"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DatasetViewSectionToggle;
