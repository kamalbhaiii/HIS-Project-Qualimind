import React from "react";
import PropTypes from "prop-types";

import SurfaceCard from "../../atoms/SurfaceCard";
import Typography from "../../atoms/CustomTypography";
import FlexBox from "../../atoms/FlexBox";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";
import Box from "@mui/material/Box";

import DataViewFormatToggle from "../../molecules/DataViewFormatToggle";
import DatasetDownloadActions from "../../molecules/DatasetDownloadActions";

const DatasetViewPanel = ({
  mode,
  jobStatus,
  jobErrorMessage,
  datasetName,
  viewFormat,
  onViewFormatChange,
  originalCsv,
  originalColumns,
  originalRows,
  processedCsv,
  processedColumns,
  processedRows,
}) => {
  const isProcessing = jobStatus === "PENDING" || jobStatus === "RUNNING";
  const isFailed = jobStatus === "FAILED";
  const hasProcessedData = !!processedCsv;

  const activeColumns = mode === "original" ? originalColumns : processedColumns;
  const activeRows = mode === "original" ? originalRows : processedRows;
  const activeCsv = mode === "original" ? originalCsv : processedCsv;

  const safeColumns = Array.isArray(activeColumns) ? activeColumns : [];
  const safeRows = Array.isArray(activeRows) ? activeRows : [];

  const downloadFile = (content, filename, mimeType = "text/plain") => {
    if (!content) return;
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const makeFilename = (ext) => {
    const base = datasetName || "dataset";
    const suffix = mode === "original" ? "original" : "processed";
    return `${base.replace(/\s+/g, "_")}_${suffix}.${ext}`;
  };

  const handleDownloadCsv = () => {
    if (!activeCsv) return;
    downloadFile(activeCsv, makeFilename("csv"), "text/csv;charset=utf-8;");
  };

  const handleDownloadJson = () => {
    if (!safeRows.length) return;
    const json = JSON.stringify(safeRows, null, 2);
    downloadFile(json, makeFilename("json"), "application/json");
  };

  const previewHeight = "clamp(240px, 40vh, 420px)";

  const renderTable = (columns, rows) => (
    <>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Showing {rows.length} rows • {columns.length} columns
      </Typography>

      {/* Scroll stays inside the panel */}
      <TableContainer
        sx={{
          maxHeight: previewHeight,
          width: "100%",
          maxWidth: "100%",
          overflow: "auto",
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            width: "100%",
            tableLayout: "auto",
            minWidth: 600, // forces horizontal scroll inside container on small screens
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                    // on narrow screens, constrain header cells a bit
                    maxWidth: { xs: 140, sm: 220, md: 320 },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)}>
                  <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                    No preview available for this dataset.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        whiteSpace: "nowrap",
                        maxWidth: { xs: 160, sm: 240, md: 360 },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={
                        row && row[col] !== undefined && row[col] !== null
                          ? String(row[col])
                          : ""
                      }
                    >
                      {row && row[col] !== undefined && row[col] !== null
                        ? String(row[col])
                        : ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  const renderCsvText = (csvString) => {
    if (!csvString) {
      return (
        <Typography variant="body2" color="textSecondary">
          No CSV data is available for this dataset.
        </Typography>
      );
    }

    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: { xs: 1, sm: 1.5 },
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.4,
          whiteSpace: "pre",
          maxHeight: previewHeight,
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: "auto",
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        {csvString}
      </Box>
    );
  };

  const renderJson = (rows) => {
    if (!rows || rows.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No JSON data is available for this dataset.
        </Typography>
      );
    }

    const json = JSON.stringify(rows, null, 2);

    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          p: { xs: 1, sm: 1.5 },
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.4,
          whiteSpace: "pre",
          maxHeight: previewHeight,
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: "auto",
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          backgroundColor: (theme) => theme.palette.background.default,
        }}
      >
        {json}
      </Box>
    );
  };

  const renderViewContent = () => {
    if (viewFormat === "csv") return renderCsvText(activeCsv);
    if (viewFormat === "json") return renderJson(safeRows);
    return renderTable(safeColumns, safeRows);
  };

  const downloadDisabled =
    mode === "original"
      ? !originalCsv && !(Array.isArray(originalRows) && originalRows.length)
      : !processedCsv && !(Array.isArray(processedRows) && processedRows.length);

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
      {/* Responsive header */}
      <FlexBox
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          mb: 1.5,
          minWidth: 0,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            minWidth: 0,
            width: "100%",
            pr: { xs: 0, sm: 2 },
          }}
        >
          {mode === "original"
            ? "Original dataset (uploaded file)"
            : "Preprocessed dataset"}
        </Typography>

        <FlexBox
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
            width: { xs: "100%", sm: "auto" },
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: "0 0 auto" }}>
            <DataViewFormatToggle format={viewFormat} onChange={onViewFormatChange} />
          </Box>

          <Box sx={{ flex: "0 0 auto" }}>
            <DatasetDownloadActions
              disabled={downloadDisabled}
              onDownloadCsv={handleDownloadCsv}
              onDownloadJson={handleDownloadJson}
            />
          </Box>
        </FlexBox>
      </FlexBox>

      {mode === "original" && (
        <>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This is a preview of the dataset as you originally uploaded it.
          </Typography>

          {renderViewContent()}
        </>
      )}

      {mode === "processed" && (
        <>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            This is the preprocessed version of your dataset generated by the latest job.
          </Typography>

          {!hasProcessedData && isProcessing && (
            <FlexBox
              sx={{
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 2,
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The preprocessing job is still in progress ({String(jobStatus).toLowerCase()}).
                <br />
                Once it completes successfully, the processed dataset preview will appear here.
              </Typography>
            </FlexBox>
          )}

          {!hasProcessedData && (isFailed || (!isProcessing && jobStatus !== "SUCCESS")) && (
            <FlexBox
              sx={{
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                px: 2,
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The preprocessing job for this dataset did not produce any processed output.
                <br />
                {isFailed && (
                  <>
                    Job status: <strong>FAILED</strong>.
                    <br />
                    {jobErrorMessage && <span>Error from backend: {jobErrorMessage}</span>}
                  </>
                )}
              </Typography>
            </FlexBox>
          )}

          {hasProcessedData && !isProcessing && !isFailed && renderViewContent()}
        </>
      )}
    </SurfaceCard>
  );
};

DatasetViewPanel.propTypes = {
  mode: PropTypes.oneOf(["original", "processed"]).isRequired,
  jobStatus: PropTypes.oneOf(["PENDING", "RUNNING", "SUCCESS", "FAILED"]).isRequired,
  jobErrorMessage: PropTypes.string,
  datasetName: PropTypes.string,
  viewFormat: PropTypes.oneOf(["table", "csv", "json"]).isRequired,
  onViewFormatChange: PropTypes.func.isRequired,

  // These are optional because the component explicitly supports "not available yet" states.
  originalCsv: PropTypes.string,
  originalColumns: PropTypes.arrayOf(PropTypes.string),
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedCsv: PropTypes.string,
  processedColumns: PropTypes.arrayOf(PropTypes.string),
  processedRows: PropTypes.arrayOf(PropTypes.object),
};

DatasetViewPanel.defaultProps = {
  jobErrorMessage: "",
  datasetName: "",
  originalCsv: "",
  originalColumns: [],
  originalRows: [],
  processedCsv: "",
  processedColumns: [],
  processedRows: [],
};

export default DatasetViewPanel;
