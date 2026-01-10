// src/components/organisms/viz/BoxplotSection/index.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";

import SectionTitle from "../../../atoms/SectionTitle";
import { EBoxplot } from "../../../molecules/Echarts";
import { buildBoxplotSeries } from "../../../../lib/chartData";

const BoxplotSection = ({ rows, columns, filename, label = "Boxplot" }) => {
  const series = useMemo(() => buildBoxplotSeries(rows, (columns || []).slice(0, 6)), [rows, columns]);

  if (!series?.labels?.length) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <SectionTitle title={label} subtitle="Five-number summary: min, Q1, median, Q3, max." />
      <EBoxplot
        title="Boxplot"
        labels={series.labels}
        data={series.data}
        filename={`${filename || "dataset"}_boxplot`}
        showDownload
      />
    </Box>
  );
};

BoxplotSection.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(PropTypes.string),
  filename: PropTypes.string,
  label: PropTypes.string,
};

export default BoxplotSection;
