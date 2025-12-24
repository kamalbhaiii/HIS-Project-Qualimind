import React from "react";
import PropTypes from "prop-types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
} from "recharts";
import Box from "@mui/material/Box";

export const HistogramChart = ({ data }) => (
  <Box sx={{ width: "100%", height: 240 }}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bin" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" />
      </BarChart>
    </ResponsiveContainer>
  </Box>
);

export const CategoryBarChart = ({ data }) => (
  <Box sx={{ width: "100%", height: 240 }}>
    <ResponsiveContainer>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" />
      </BarChart>
    </ResponsiveContainer>
  </Box>
);

export const ScatterPlot = ({ data, xLabel, yLabel }) => (
  <Box sx={{ width: "100%", height: 260 }}>
    <ResponsiveContainer>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name={xLabel} />
        <YAxis type="number" dataKey="y" name={yLabel} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} />
      </ScatterChart>
    </ResponsiveContainer>
  </Box>
);

HistogramChart.propTypes = { data: PropTypes.array.isRequired };
CategoryBarChart.propTypes = { data: PropTypes.array.isRequired };
ScatterPlot.propTypes = {
  data: PropTypes.array.isRequired,
  xLabel: PropTypes.string.isRequired,
  yLabel: PropTypes.string.isRequired,
};
