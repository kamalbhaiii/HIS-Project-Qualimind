import React, { useMemo } from "react";
import PropTypes from "prop-types";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import ChartCard from "../../molecules/ChartCard";
import CorrelationHeatmap from "../../molecules/CorrelationHeatmap";
import { HistogramChart, CategoryBarChart, ScatterPlot } from "../../molecules/BasicCharts";

import {
  getNumericColumnsFromRows,
  getCategoricalColumnsFromRows,
  buildHistogram,
  buildCategoryCounts,
  buildScatter,
} from "../../../lib/chartData";

const DatasetVisualizationPanel = ({
  loading,
  jobRunning,
  originalRows,
  processedRows,
  metadata,
}) => {
  const showLoading = loading || jobRunning;

  const corr = metadata?.correlation || null;
  const corrColumns = Array.isArray(corr?.used_columns) ? corr.used_columns : [];

  const numericCols = useMemo(
    () => getNumericColumnsFromRows(processedRows),
    [processedRows]
  );

  const categoricalColsOriginal = useMemo(
    () => getCategoricalColumnsFromRows(originalRows, 50),
    [originalRows]
  );

  // pick first 2 numeric columns for scatter if correlation not provided
  const topPair = useMemo(() => {
    if (corr?.top_pairs?.length) return corr.top_pairs[0];
    if (numericCols.length >= 2) return { col1: numericCols[0], col2: numericCols[1], r: null };
    return null;
  }, [corr, numericCols]);

  const scatterData = useMemo(() => {
    if (!topPair) return [];
    return buildScatter(processedRows, topPair.col1, topPair.col2);
  }, [processedRows, topPair]);

  const histTargets = useMemo(() => {
    // show up to 2 numeric histograms (common expectation)
    return numericCols.slice(0, 2);
  }, [numericCols]);

  const histData = useMemo(() => {
    const out = {};
    histTargets.forEach((c) => {
      out[c] = buildHistogram(processedRows, c, 8);
    });
    return out;
  }, [processedRows, histTargets]);

  const categoryTarget = categoricalColsOriginal[0] || null;
  const catData = useMemo(() => {
    if (!categoryTarget) return [];
    return buildCategoryCounts(originalRows, categoryTarget, 12);
  }, [originalRows, categoryTarget]);

  const previewNote = "Charts are computed from preview rows only.";

  return (
    <FlexBox
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: { xs: 2, sm: 2.5 },
        width: "100%",
        minWidth: 0,
      }}
    >
      {/* Correlation heatmap */}
      <ChartCard
        title="Correlation heatmap"
        subtitle="Pairwise correlation for requested numeric columns."
        loading={showLoading}
        footer={previewNote}
        sx={{ gridColumn: { xs: "auto", md: "1 / span 2" } }}
      >
        {!corr ? (
          <Typography variant="body2" color="textSecondary">
            Correlation was not requested for this job.
          </Typography>
        ) : corr?.error ? (
          <Typography variant="body2" color="error">
            Correlation failed: {String(corr.error)}
          </Typography>
        ) : (
          <CorrelationHeatmap columns={corrColumns} matrix={corr.matrix} />
        )}
      </ChartCard>

      {/* Scatter plot for top correlated pair */}
      <ChartCard
        title="Correlation scatter plot"
        subtitle={
          topPair
            ? `${topPair.col1} vs ${topPair.col2}${typeof topPair.r === "number" ? ` (r=${topPair.r.toFixed(3)})` : ""}`
            : "No pair available"
        }
        loading={showLoading}
        footer={previewNote}
      >
        {!topPair ? (
          <Typography variant="body2" color="textSecondary">
            Not enough numeric columns to plot.
          </Typography>
        ) : scatterData.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Not enough numeric points in the preview to plot.
          </Typography>
        ) : (
          <ScatterPlot data={scatterData} xLabel={topPair.col1} yLabel={topPair.col2} />
        )}
      </ChartCard>

      {/* Categorical distribution (from original rows) */}
      <ChartCard
        title="Categorical distribution"
        subtitle={categoryTarget ? `Top categories for "${categoryTarget}"` : "No categorical column found"}
        loading={showLoading}
        footer={previewNote}
      >
        {!categoryTarget ? (
          <Typography variant="body2" color="textSecondary">
            No categorical column available in the original preview.
          </Typography>
        ) : (
          <CategoryBarChart data={catData} />
        )}
      </ChartCard>

      {/* Numeric distributions */}
      {histTargets.map((col) => (
        <ChartCard
          key={col}
          title="Numeric distribution"
          subtitle={`Histogram for "${col}"`}
          loading={showLoading}
          footer={previewNote}
        >
          {histData[col]?.length ? (
            <HistogramChart data={histData[col]} />
          ) : (
            <Typography variant="body2" color="textSecondary">
              Not enough numeric values to build a histogram.
            </Typography>
          )}
        </ChartCard>
      ))}
    </FlexBox>
  );
};

DatasetVisualizationPanel.propTypes = {
  loading: PropTypes.bool,
  jobRunning: PropTypes.bool,
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  metadata: PropTypes.object,
};

DatasetVisualizationPanel.defaultProps = {
  loading: false,
  jobRunning: false,
  originalRows: [],
  processedRows: [],
  metadata: null,
};

export default DatasetVisualizationPanel;
