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

  const activeColumns =
    mode === "original" ? originalColumns : processedColumns;
  const activeRows = mode === "original" ? originalRows : processedRows;
  const activeCsv = mode === "original" ? originalCsv : processedCsv;

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
    if (!activeRows || !activeRows.length) return;
    const json = JSON.stringify(activeRows, null, 2);
    downloadFile(json, makeFilename("json"), "application/json");
  };

  const renderTable = (columns, rows) => (
    <>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Showing {rows.length} rows • {columns.length} columns
      </Typography>

      {/* ✨ SCROLL INSIDE PANEL, NOT PAGE */}
      <TableContainer
        sx={{
          maxHeight: 320,
          maxWidth: "100%",
          overflow: "auto",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            tableLayout: "auto",
            width: "100%",
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{ py: 2 }}
                  >
                    No preview available for this dataset.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell
                      key={col}
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {row[col]}
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
          p: 1.5,
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre",
          maxHeight: 320,
          width: "100%",        // 🔑 restrict width to panel
          maxWidth: "100%",     // 🔑 avoid growing wider than card
          overflowX: "auto",    // 🔑 horizontal scroll inside panel
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
          p: 1.5,
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre",
          maxHeight: 320,
          width: "100%",        // 🔑 same trick as CSV
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
    if (viewFormat === "json") return renderJson(activeRows);
    return renderTable(activeColumns, activeRows);
  };

  return (
    <SurfaceCard
      sx={{
        p: 3,
        borderRadius: 2,
        minWidth: 0,   // 🔑 allow card to shrink in flex/grid
        overflow: "hidden",
      }}
    >
      {/* header row: title + view format + downloads */}
      <FlexBox
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 1.5,
          minWidth: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 0 }}>
          {mode === "original"
            ? "Original dataset (uploaded file)"
            : "Preprocessed dataset"}
        </Typography>

        <FlexBox
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            minWidth: 0,
          }}
        >
          <DataViewFormatToggle
            format={viewFormat}
            onChange={onViewFormatChange}
          />
          <DatasetDownloadActions
            disabled={
              mode === "original"
                ? !originalCsv || !originalRows.length
                : !processedCsv || !processedRows.length
            }
            onDownloadCsv={handleDownloadCsv}
            onDownloadJson={handleDownloadJson}
          />
        </FlexBox>
      </FlexBox>

      {mode === "original" && (
        <>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 2 }}
          >
            This is a preview of the dataset as you originally uploaded it.
          </Typography>

          {renderViewContent()}
        </>
      )}

      {mode === "processed" && (
        <>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mb: 2 }}
          >
            This is the preprocessed version of your dataset generated by the
            latest job.
          </Typography>

          {(!hasProcessedData && isProcessing) && (
            <FlexBox
              sx={{
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The preprocessing job is still in progress (
                {jobStatus.toLowerCase()}).
                <br />
                Once it completes successfully, the processed dataset preview
                will appear here.
              </Typography>
            </FlexBox>
          )}

          {(!hasProcessedData && (isFailed || (!isProcessing && jobStatus !== "SUCCESS"))) && (
            <FlexBox
              sx={{
                minHeight: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Typography variant="body1" color="textSecondary">
                The preprocessing job for this dataset did not produce any
                processed output.
                <br />
                {isFailed && (
                  <>
                    Job status: <strong>FAILED</strong>.
                    <br />
                    {jobErrorMessage && (
                      <span>Error from backend: {jobErrorMessage}</span>
                    )}
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
  jobStatus: PropTypes.oneOf(["PENDING", "RUNNING", "SUCCESS", "FAILED"])
    .isRequired,
  jobErrorMessage: PropTypes.string,
  datasetName: PropTypes.string,
  viewFormat: PropTypes.oneOf(["table", "csv", "json"]).isRequired,
  onViewFormatChange: PropTypes.func.isRequired,
  originalCsv: PropTypes.string.isRequired,
  originalColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  originalRows: PropTypes.arrayOf(PropTypes.object).isRequired,
  processedCsv: PropTypes.string.isRequired,
  processedColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  processedRows: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default DatasetViewPanel;
