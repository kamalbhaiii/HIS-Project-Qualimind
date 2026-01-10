// src/components/organisms/viz/NumericSummarySection/index.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableContainer from "@mui/material/TableContainer";

import SectionTitle from "../../../atoms/SectionTitle";
import { EBar } from "../../../molecules/Echarts";
import { buildNumericSummary } from "../../../../lib/chartData";

function fmt(n) {
  return typeof n === "number" ? n.toFixed(4) : "—";
}

const NumericSummarySection = ({ originalRows, processedRows, columns, filename }) => {
  const rows = useMemo(() => {
    const cols = (columns || []).filter(Boolean).slice(0, 6);
    if (!cols.length) return [];
    return cols.map((c) => ({ col: c, o: buildNumericSummary(originalRows, c), p: buildNumericSummary(processedRows, c) }));
  }, [columns, originalRows, processedRows]);

  const hasAny = rows.some((r) => r.o || r.p);
  if (!hasAny) return null;

  const meanShift = rows
    .filter((r) => r.o && r.p)
    .map((r) => ({ label: r.col, value: (r.p.mean ?? 0) - (r.o.mean ?? 0) }));

  const sdRatio = rows
    .filter((r) => r.o && r.p && typeof r.o.sd === "number" && r.o.sd !== 0)
    .map((r) => ({ label: r.col, value: (r.p.sd ?? 0) / r.o.sd }));

  return (
    <Box sx={{ width: "100%" }}>
      <SectionTitle title="Summary statistics" subtitle="Preview rows only. Useful to validate scaling, imputation, and drift." />

      <TableContainer sx={{ borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}`, maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>Column</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Orig mean</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Proc mean</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Orig sd</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Proc sd</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Orig median</TableCell>
              <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>Proc median</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={`sum-${r.col}`} hover>
                <TableCell>{r.col}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.o?.mean)}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.p?.mean)}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.o?.sd)}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.p?.sd)}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.o?.median)}</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{fmt(r.p?.median)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {(meanShift.length || sdRatio.length) ? <Divider sx={{ my: 2 }} /> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
        {meanShift.length ? (
          <EBar
            title="Mean shift (proc - orig)"
            data={meanShift}
            xLabel="Shift"
            yLabel="Column"
            horizontal
            filename={`${filename || "dataset"}_mean_shift`}
            showDownload
          />
        ) : null}

        {sdRatio.length ? (
          <EBar
            title="SD ratio (proc / orig)"
            data={sdRatio}
            xLabel="Ratio"
            yLabel="Column"
            horizontal
            filename={`${filename || "dataset"}_sd_ratio`}
            showDownload
          />
        ) : null}
      </Box>
    </Box>
  );
};

NumericSummarySection.propTypes = {
  originalRows: PropTypes.arrayOf(PropTypes.object),
  processedRows: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(PropTypes.string),
  filename: PropTypes.string,
};

export default NumericSummarySection;
