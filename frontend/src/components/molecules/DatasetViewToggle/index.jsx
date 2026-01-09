// src/components/molecules/DatasetViewToggle/index.jsx
import React from "react";
import PropTypes from "prop-types";

import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import Tooltip from "@mui/material/Tooltip";

const DatasetViewToggle = ({ mode, onChange }) => {
  const handleChange = (_, next) => {
    if (!next) return;
    onChange(next);
  };

  return (
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontWeight: 800,
          px: 1.5,
        },
      }}
    >
      <Tooltip title="Original dataset (as uploaded)">
        <ToggleButton value="original">Original</ToggleButton>
      </Tooltip>
      <Tooltip title="Processed dataset (after preprocessing)">
        <ToggleButton value="processed">Processed</ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
};

DatasetViewToggle.propTypes = {
  mode: PropTypes.oneOf(["original", "processed"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DatasetViewToggle;
