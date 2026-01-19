// src/components/organisms/viz/CategoryDriftSection/index.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";

import SectionTitle from "../../../atoms/SectionTitle";
import { EStackedBar } from "../../../molecules/Echarts";
import { buildCategoryCounts } from "../../../../lib/chartData";
import Alert from "@mui/material/Alert";

function buildProportionDrift(originalRows, processedRows, col) {
  if (!col) return null;

  const o = buildCategoryCounts(originalRows, col, 8);
  const p = buildCategoryCounts(processedRows, col, 8);

  const oN = (originalRows || []).length || 1;
  const pN = (processedRows || []).length || 1;

  const keys = new Set([...o.map((x) => x.label), ...p.map((x) => x.label)]);
  const all = Array.from(keys);

  const oMap = new Map(o.map((x) => [x.label, (x.value || 0) / oN]));
  const pMap = new Map(p.map((x) => [x.label, (x.value || 0) / pN]));

  const series = all
    .map((k) => ({ name: k, values: [oMap.get(k) || 0, pMap.get(k) || 0] }))
    .sort((a, b) => Math.max(...b.values) - Math.max(...a.values))
    .slice(0, 8);

  return { categories: ["Original", "Processed"], series };
}

const CategoryDriftSection = ({ originalRows, processedRows, column, filename }) => {
  const drift = useMemo(() => buildProportionDrift(originalRows, processedRows, column), [originalRows, processedRows, column]);
  if (!drift?.series?.length) return null;

  const hasOriginal = Array.isArray(originalRows) && originalRows.length > 0 && originalRows[0] && Object.prototype.hasOwnProperty.call(originalRows[0], column);
    const hasProcessed = Array.isArray(processedRows) && processedRows.length > 0 && processedRows[0] && Object.prototype.hasOwnProperty.call(processedRows[0], column);

    if (!hasOriginal || !hasProcessed) {
    return (
        <Alert severity="info">
        Category drift cannot be computed because the selected column is not present in both datasets.
        This typically happens when categorical columns are encoded/renamed during preprocessing.
        </Alert>
    );
    }

  return (
    <Box sx={{ width: "100%" }}>
      <SectionTitle title="Category proportions" subtitle="Top categories (by prevalence) compared across original vs processed." />
      <EStackedBar
        title="Category proportions"
        categories={drift.categories}
        series={drift.series}
        yLabel="Proportion"
        filename={`${filename || "dataset"}_category_drift_${column}`}
        showDownload
      />
    </Box>
  );
};

CategoryDriftSection.propTypes = {
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  column: PropTypes.string,
  filename: PropTypes.string,
};

export default CategoryDriftSection;
