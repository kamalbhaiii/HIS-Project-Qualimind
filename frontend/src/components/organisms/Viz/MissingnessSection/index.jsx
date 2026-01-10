// src/components/organisms/viz/MissingnessSection/index.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";

import SectionTitle from "../../../atoms/SectionTitle";
import { EBar } from "../../../molecules/Echarts";
import { buildMissingnessByColumn } from "../../../../lib/chartData";

function buildMissingBars(originalRows, processedRows) {
  const getCols = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0]) return [];
    return Object.keys(rows[0]);
  };

  const pickTop = (items, n = 12) => {
    return (items || [])
      .slice()
      .sort((a, b) => (b.missing || 0) - (a.missing || 0))
      .slice(0, n);
  };

  const originalCols = getCols(originalRows);
  const processedCols = getCols(processedRows);

  // If neither dataset has columns, nothing to render
  if (!originalCols.length && !processedCols.length) return null;

  // IMPORTANT:
  // Compute missingness only against columns that actually exist in that dataset.
  // This prevents "all rows missing" artifacts for columns that don't exist.
  const o = originalCols.length ? buildMissingnessByColumn(originalRows, originalCols) : [];
  const p = processedCols.length ? buildMissingnessByColumn(processedRows, processedCols) : [];

  const oTop = pickTop(o, 12);
  const pTop = pickTop(p, 12);

  return {
    original: oTop.map((x) => ({ label: x.col, value: x.missing })),
    processed: pTop.map((x) => ({ label: x.col, value: x.missing })),
  };
}


const MissingnessSection = ({ originalRows, processedRows, filename }) => {
  const bars = useMemo(() => buildMissingBars(originalRows, processedRows), [originalRows, processedRows]);

  if (!bars) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <SectionTitle title="Missing values per column" subtitle="Computed from preview rows (client-side)." />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <SectionTitle title="Original" />
          <EBar
            title="Missing (original)"
            data={bars.original}
            xLabel="Missing count"
            yLabel="Columns"
            horizontal
            filename={`${filename || "dataset"}_missing_original`}
            showDownload
          />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <SectionTitle title="Processed" />
          <EBar
            title="Missing (processed)"
            data={bars.processed}
            xLabel="Missing count"
            yLabel="Columns"
            horizontal
            filename={`${filename || "dataset"}_missing_processed`}
            showDownload
          />
        </Box>
      </Box>
    </Box>
  );
};

MissingnessSection.propTypes = {
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  filename: PropTypes.string,
};

export default MissingnessSection;
