// src/components/organisms/viz/ECDFSection/index.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";

import SectionTitle from "../../../atoms/SectionTitle";
import { ELine } from "../../../molecules/Echarts";
import { buildECDF } from "../../../../lib/chartData";

const ECDFSection = ({ originalRows, processedRows, column, filename }) => {
  const ecdfO = useMemo(() => (column ? buildECDF(originalRows, column) : []), [originalRows, column]);
  const ecdfP = useMemo(() => (column ? buildECDF(processedRows, column) : []), [processedRows, column]);

  const hasAny = ecdfO.length >= 2 || ecdfP.length >= 2;
  if (!hasAny) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <SectionTitle title="ECDF" subtitle="Empirical cumulative distribution. Useful for shape comparisons." />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
        {ecdfO.length >= 2 ? (
          <ELine
            title="ECDF (original)"
            data={ecdfO}
            xLabel={column}
            yLabel="F(x)"
            filename={`${filename || "dataset"}_ecdf_original_${column}`}
            showDownload
          />
        ) : null}

        {ecdfP.length >= 2 ? (
          <ELine
            title="ECDF (processed)"
            data={ecdfP}
            xLabel={column}
            yLabel="F(x)"
            filename={`${filename || "dataset"}_ecdf_processed_${column}`}
            showDownload
          />
        ) : null}
      </Box>
    </Box>
  );
};

ECDFSection.propTypes = {
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  column: PropTypes.string,
  filename: PropTypes.string,
};

export default ECDFSection;
