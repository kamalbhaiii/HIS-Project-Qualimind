// src/components/molecules/DatasetViewSectionToggle/index.jsx
import React from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";

const DatasetViewSectionToggle = ({ value, onChange }) => {
  const handleChange = (_, v) => onChange(v);

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 800 },
        }}
      >
        <Tooltip title="View dataset preview (table/CSV/JSON)">
          <Tab value="preview" label="Preview" />
        </Tooltip>
        <Tooltip title="Explore charts, correlations, and optional AI insights">
          <Tab value="visualize" label="Visualize" />
        </Tooltip>
      </Tabs>
    </Box>
  );
};

DatasetViewSectionToggle.propTypes = {
  value: PropTypes.oneOf(["preview", "visualize"]).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DatasetViewSectionToggle;
