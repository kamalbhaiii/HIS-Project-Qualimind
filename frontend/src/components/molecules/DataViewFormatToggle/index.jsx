// src/components/molecules/DataViewFormatToggle.jsx
import React from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const DataViewFormatToggle = ({ format, onChange }) => {
  const handleChange = (_event, next) => {
    if (!next) return;
    onChange(next);
  };

  return (
    <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" color="textSecondary">
        View as:
      </Typography>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={format}
        onChange={handleChange}
      >
        <ToggleButton value="table">Table</ToggleButton>
        <ToggleButton value="csv">CSV</ToggleButton>
        <ToggleButton value="json">JSON</ToggleButton>
      </ToggleButtonGroup>
    </FlexBox>
  );
};

DataViewFormatToggle.propTypes = {
  format: PropTypes.oneOf(["table", "csv", "json"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DataViewFormatToggle;
