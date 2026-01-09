// src/components/molecules/ECharts/index.jsx
import React, { useMemo, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import ReactECharts from "echarts-for-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DownloadIcon from "@mui/icons-material/Download";

// Registers wordCloud series type
import "echarts-wordcloud";

const baseGrid = { left: 56, right: 18, top: 32, bottom: 52, containLabel: true };

function safeName(x) {
  return String(x || "chart")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .slice(0, 80);
}

function ChartShell({ filename, height = 340, option, showDownload = true }) {
  const ref = useRef(null);

  // Manual, safe resize (avoids "disconnect undefined" in some builds)
  useEffect(() => {
    const inst = ref.current?.getEchartsInstance?.();
    if (!inst) return;

    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          inst.resize();
        } catch {
          // ignore
        }
      });
    };

    window.addEventListener("resize", onResize);
    // initial resize
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [option]);

  const onDownload = useCallback(() => {
    try {
      const inst = ref.current?.getEchartsInstance?.();
      if (!inst) return;

      const dataUrl = inst.getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safeName(filename)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ignore
    }
  }, [filename]);

  return (
    <Box sx={{ width: "100%" }}>
      {showDownload && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={onDownload}>
            Download PNG
          </Button>
        </Box>
      )}

      <ReactECharts
        ref={ref}
        option={option}
        style={{ height, width: "100%" }}
        notMerge
        lazyUpdate
        // This is the critical fix for the disconnect() error in many setups:
        useResizeHandler={false}
      />
    </Box>
  );
}

ChartShell.propTypes = {
  filename: PropTypes.string,
  height: PropTypes.number,
  option: PropTypes.object.isRequired,
  showDownload: PropTypes.bool,
};

/* ------------------------- EHistogram ------------------------- */
export function EHistogram({ title, data, xLabel, yLabel, filename, showDownload }) {
  const option = useMemo(() => {
    const xs = (data || []).map((d) => d.bin ?? d.label ?? "");
    const ys = (data || []).map((d) => d.count ?? d.value ?? 0);

    return {
      tooltip: { trigger: "axis" },
      grid: baseGrid,
      xAxis: { type: "category", data: xs, name: xLabel || "", nameGap: 28 },
      yAxis: { type: "value", name: yLabel || "Count" },
      series: [{ type: "bar", data: ys, barMaxWidth: 26 }],
    };
  }, [data, xLabel, yLabel]);

  return <ChartShell filename={filename || title} option={option} showDownload={showDownload} />;
}

EHistogram.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  filename: PropTypes.string,
  showDownload: PropTypes.bool,
};

/* ------------------------- EBar ------------------------- */
export function EBar({ title, data, xLabel, yLabel, horizontal = false, filename, showDownload, height = 360 }) {
  const option = useMemo(() => {
    const labels = (data || []).map((d) => d.label ?? "");
    const values = (data || []).map((d) => d.value ?? 0);

    const xAxis = horizontal
      ? { type: "value", name: xLabel || "", nameGap: 24 }
      : { type: "category", data: labels, name: xLabel || "", nameGap: 28 };

    const yAxis = horizontal
      ? { type: "category", data: labels, name: yLabel || "", nameGap: 28 }
      : { type: "value", name: yLabel || "", nameGap: 24 };

    return {
      tooltip: { trigger: "axis" },
      grid: baseGrid,
      xAxis,
      yAxis,
      series: [{ type: "bar", data: values, barMaxWidth: 28 }],
    };
  }, [data, xLabel, yLabel, horizontal]);

  return <ChartShell filename={filename || title} option={option} showDownload={showDownload} height={height} />;
}

EBar.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  horizontal: PropTypes.bool,
  filename: PropTypes.string,
  showDownload: PropTypes.bool,
  height: PropTypes.number,
};

/* ------------------------- EScatter ------------------------- */
export function EScatter({ title, data, xLabel, yLabel, filename, showDownload }) {
  const option = useMemo(() => {
    const pts = (data || []).map((d) => [d.x, d.y]).filter((p) => typeof p[0] === "number" && typeof p[1] === "number");

    return {
      tooltip: {
        trigger: "item",
        formatter: (p) => `${xLabel || "x"}: ${p?.value?.[0] ?? ""}<br/>${yLabel || "y"}: ${p?.value?.[1] ?? ""}`,
      },
      grid: baseGrid,
      xAxis: { type: "value", name: xLabel || "", nameGap: 28 },
      yAxis: { type: "value", name: yLabel || "", nameGap: 28 },
      series: [{ type: "scatter", data: pts, symbolSize: 7 }],
    };
  }, [data, xLabel, yLabel]);

  return <ChartShell filename={filename || title} option={option} showDownload={showDownload} height={420} />;
}

EScatter.propTypes = {
  title: PropTypes.string,
  data: PropTypes.array,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  filename: PropTypes.string,
  showDownload: PropTypes.bool,
};

/* ------------------------- EHeatmap ------------------------- */
export function EHeatmap({ title, columns, matrix, filename, showDownload }) {
  const option = useMemo(() => {
    const cols = columns || [];
    const data = [];

    for (let i = 0; i < (matrix || []).length; i += 1) {
      for (let j = 0; j < (matrix[i] || []).length; j += 1) {
        const v = matrix[i][j];
        data.push([j, i, typeof v === "number" ? v : null]);
      }
    }

    return {
      tooltip: {
        position: "top",
        formatter: (p) => {
          const x = cols[p?.value?.[0]] ?? "";
          const y = cols[p?.value?.[1]] ?? "";
          const v = p?.value?.[2];
          return `${y} ↔ ${x}<br/>r: ${typeof v === "number" ? v.toFixed(4) : "—"}`;
        },
      },
      grid: { left: 84, right: 18, top: 36, bottom: 84, containLabel: true },
      xAxis: { type: "category", data: cols },
      yAxis: { type: "category", data: cols },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 10,
      },
      series: [
        {
          type: "heatmap",
          data,
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.25)" } },
        },
      ],
    };
  }, [columns, matrix]);

  return <ChartShell filename={filename || title} option={option} showDownload={showDownload} height={520} />;
}

EHeatmap.propTypes = {
  title: PropTypes.string,
  columns: PropTypes.array,
  matrix: PropTypes.array,
  filename: PropTypes.string,
  showDownload: PropTypes.bool,
};

/* ------------------------- EWordCloud ------------------------- */
export function EWordCloud({ title, words, filename, showDownload, minFontSize = 12, maxFontSize = 56 }) {
  const option = useMemo(() => {
    const data = (words || [])
      .filter((w) => w && typeof w.word === "string" && typeof w.count === "number")
      .map((w) => ({ name: w.word, value: w.count }));

    return {
      tooltip: { formatter: (p) => `${p?.name || ""}: ${p?.value ?? ""}` },
      series: [
        {
          type: "wordCloud",
          shape: "circle",
          width: "100%",
          height: "100%",
          gridSize: 6,
          sizeRange: [minFontSize, maxFontSize],
          rotationRange: [-45, 45],
          rotationStep: 15,
          layoutAnimation: true,
          textStyle: { fontFamily: "sans-serif" },
          emphasis: { focus: "self" },
          data,
        },
      ],
    };
  }, [words, minFontSize, maxFontSize]);

  return <ChartShell filename={filename || title} option={option} showDownload={showDownload} height={420} />;
}

EWordCloud.propTypes = {
  title: PropTypes.string,
  words: PropTypes.array,
  filename: PropTypes.string,
  showDownload: PropTypes.bool,
  minFontSize: PropTypes.number,
  maxFontSize: PropTypes.number,
};
