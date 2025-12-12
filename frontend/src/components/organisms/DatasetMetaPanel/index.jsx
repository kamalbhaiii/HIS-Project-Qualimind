import React from "react";
import PropTypes from "prop-types";

import SurfaceCard from "../../atoms/SurfaceCard";
import Typography from "../../atoms/CustomTypography";
import FlexBox from "../../atoms/FlexBox";
import StatusChip from "../../atoms/StatusChip";
import KeyValueItem from "../../molecules/KeyValueItem";

import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

const DatasetMetaPanel = ({ dataset }) => {
  const safeNumber = (value) =>
    typeof value === "number" ? value.toLocaleString() : "—";

  const safeValue = (value) =>
    value !== null && value !== undefined && value !== "" ? value : "—";

  if (!dataset) return null;

  const requestedTasks = Array.isArray(dataset.preprocessingTasks)
    ? dataset.preprocessingTasks.join(", ")
    : "—";

  return (
    <SurfaceCard
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {/* Responsive header: name + status */}
      <FlexBox
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          mb: 2,
          gap: 1.5,
          minWidth: 0,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            minWidth: 0,
            width: "100%",
            // prevent long names from forcing page horizontal scroll
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={safeValue(dataset.name)}
        >
          {safeValue(dataset.name)}
        </Typography>

        <Box
          sx={{
            flex: "0 0 auto",
            width: { xs: "100%", sm: "auto" },
            display: "flex",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
          }}
        >
          {dataset.lastJobStatus ? (
            <StatusChip status={dataset.lastJobStatus} />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No jobs yet
            </Typography>
          )}
        </Box>
      </FlexBox>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Dataset metadata and preprocessing overview.
      </Typography>

      <Grid container spacing={2}>
        {/* Use md=6 so tablet widths still look comfortable */}
        <Grid item xs={12} md={6}>
          <KeyValueItem label="Size" value={safeValue(dataset.size)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Uploaded at" value={safeValue(dataset.uploadedAt)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Total rows" value={safeNumber(dataset.totalRows)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem
            label="Total columns"
            value={safeNumber(dataset.totalColumns)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem
            label="Categorical features"
            value={safeNumber(dataset.categoricalColumns)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem
            label="Numeric features"
            value={safeNumber(dataset.numericColumns)}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem label="Last job ID" value={safeValue(dataset.lastJobId)} />
        </Grid>

        <Grid item xs={12} md={6}>
          <KeyValueItem
            label="Last processed at"
            value={safeValue(dataset.lastProcessedAt)}
          />
        </Grid>

        {/* Long field: give it full width at all sizes */}
        <Grid item xs={12}>
          <KeyValueItem label="Requested tasks" value={requestedTasks} />
        </Grid>
      </Grid>
    </SurfaceCard>
  );
};

DatasetMetaPanel.propTypes = {
  dataset: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    size: PropTypes.string,
    uploadedAt: PropTypes.string,
    totalRows: PropTypes.number,
    totalColumns: PropTypes.number,
    categoricalColumns: PropTypes.number,
    numericColumns: PropTypes.number,
    lastJobStatus: PropTypes.oneOf(["PENDING", "RUNNING", "SUCCESS", "FAILED", null]),
    lastJobId: PropTypes.string,
    lastProcessedAt: PropTypes.string,
    preprocessingTasks: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default DatasetMetaPanel;
