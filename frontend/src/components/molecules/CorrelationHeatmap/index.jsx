import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "../../atoms/CustomTypography";
import { useTheme, alpha } from "@mui/material/styles";

const clamp01 = (x) => Math.max(0, Math.min(1, x));

const CorrelationHeatmap = ({ columns, matrix }) => {
  const theme = useTheme();
  const cols = Array.isArray(columns) ? columns : [];
  const mtx = Array.isArray(matrix) ? matrix : [];

  if (!cols.length || !mtx.length) {
    return (
      <Typography variant="body2" color="textSecondary">
        Heatmap not available.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `160px repeat(${cols.length}, minmax(56px, 1fr))`,
          gap: 0.5,
          minWidth: 160 + cols.length * 56,
        }}
      >
        <Box />
        {cols.map((c) => (
          <Box key={`h-${c}`} sx={{ p: 0.75 }}>
            <Typography variant="caption" sx={{ fontWeight: 650, whiteSpace: "nowrap" }}>
              {c}
            </Typography>
          </Box>
        ))}

        {mtx.map((row, i) => (
          <React.Fragment key={`r-${cols[i] ?? i}`}>
            <Box sx={{ p: 0.75 }}>
              <Typography variant="caption" sx={{ fontWeight: 650, whiteSpace: "nowrap" }}>
                {cols[i] ?? `col_${i}`}
              </Typography>
            </Box>

            {row.map((v, j) => {
              const val = typeof v === "number" ? v : Number(v);
              const intensity = Number.isFinite(val) ? clamp01(Math.abs(val)) : 0;
              const bg = alpha(theme.palette.primary.main, 0.12 + 0.45 * intensity);

              return (
                <Box
                  key={`c-${i}-${j}`}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    backgroundColor: bg,
                    p: 0.75,
                    textAlign: "center",
                  }}
                  title={`r(${cols[i]}, ${cols[j]}) = ${Number.isFinite(val) ? val.toFixed(3) : "NA"}`}
                >
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {Number.isFinite(val) ? val.toFixed(2) : "—"}
                  </Typography>
                </Box>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

CorrelationHeatmap.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.string),
  matrix: PropTypes.arrayOf(PropTypes.array),
};

CorrelationHeatmap.defaultProps = {
  columns: [],
  matrix: [],
};

export default CorrelationHeatmap;
