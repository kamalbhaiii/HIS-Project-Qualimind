// src/components/atoms/AnimatedIcons.jsx
import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";

/**
 * AnimatedIcons
 * - Uses currentColor (theme-aware).
 * - Subtle idle motion + stronger hover/focus motion.
 * - Uses only transforms/opacity for smooth GPU animation.
 *
 * Usage:
 *   <AnimatedDashboard />
 *   <AnimatedChevronLeft size={18} />
 *
 * Tip:
 *   In SidebarNav you can make icons feel "active" by setting
 *   color on ListItemButton.active which will automatically
 *   apply to these SVGs (currentColor).
 */

const AnimatedIconBase = ({
  children,
  size,
  titleAccess,
  sx,
  idle,
  hoverBoost,
}) => {
  return (
    <Box
      component="span"
      role={titleAccess ? "img" : "presentation"}
      aria-label={titleAccess || undefined}
      aria-hidden={titleAccess ? undefined : true}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        lineHeight: 0,
        color: "inherit",
        // CSS variables to tune behavior consistently
        "--ai-idle": idle ? "running" : "paused",
        "--ai-hover": hoverBoost ? "1" : "0",
        // Improve perceived smoothness
        transform: "translateZ(0)",
        willChange: "transform",
        // Shared keyframes
        "@keyframes ai-nudge-x": {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%": { transform: "translateX(var(--ai-nudge-x, 0px))" },
        },
        "@keyframes ai-nudge-y": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(var(--ai-nudge-y, 0px))" },
        },
        "@keyframes ai-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "@keyframes ai-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(var(--ai-pulse, 1.03))" },
        },

        // Make hover/focus strengthen animation slightly without being jumpy
        "&:hover, &:focus-visible": {
          "--ai-hover": "1",
        },

        "& svg": {
          display: "block",
          width: size,
          height: size,
          overflow: "visible",
        },

        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

AnimatedIconBase.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.number,
  titleAccess: PropTypes.string,
  sx: PropTypes.object,
  idle: PropTypes.bool,
  hoverBoost: PropTypes.bool,
};

AnimatedIconBase.defaultProps = {
  size: 20,
  titleAccess: "",
  sx: {},
  idle: true,
  hoverBoost: true,
};

/* ---------------- Chevrons ---------------- */

export const AnimatedChevronLeft = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .shaft": {
        "--ai-nudge-x": "-1.1px",
        animation: "ai-nudge-x 1.9s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "& .head": {
        "--ai-nudge-x": "-0.7px",
        animation: "ai-nudge-x 1.9s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "&:hover .shaft, &:focus-visible .shaft": {
        "--ai-nudge-x": "-1.6px",
      },
      "&:hover .head, &:focus-visible .head": {
        "--ai-nudge-x": "-1.1px",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <path className="shaft" d="M19 12H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="head" d="M11 7l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </AnimatedIconBase>
);

export const AnimatedChevronRight = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .shaft": {
        "--ai-nudge-x": "1.1px",
        animation: "ai-nudge-x 1.9s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "& .head": {
        "--ai-nudge-x": "0.7px",
        animation: "ai-nudge-x 1.9s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "&:hover .shaft, &:focus-visible .shaft": {
        "--ai-nudge-x": "1.6px",
      },
      "&:hover .head, &:focus-visible .head": {
        "--ai-nudge-x": "1.1px",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <path className="shaft" d="M5 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="head" d="M13 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </AnimatedIconBase>
);

/* ---------------- Logout ---------------- */

export const AnimatedLogout = ({ size = 18, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .arrow": {
        "--ai-nudge-x": "1.0px",
        animation: "ai-nudge-x 1.7s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "& .door": {
        opacity: 0.95,
      },
      "&:hover .arrow, &:focus-visible .arrow": {
        "--ai-nudge-x": "1.8px",
      },
      // tiny “press” feel on hover
      "&:hover": {
        transform: "translateZ(0) scale(1.02)",
        transition: "transform 120ms ease-out",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <path
        className="door"
        d="M10 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path className="arrow" d="M14 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path className="arrow" d="M7 9l-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </AnimatedIconBase>
);

/* ---------------- Dashboard ---------------- */

export const AnimatedDashboard = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .tile": {
        "--ai-pulse": "1.03",
        animation: "ai-pulse 2.6s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "& .t2": { animationDelay: "0.10s" },
      "& .t3": { animationDelay: "0.20s" },
      "& .t4": { animationDelay: "0.30s" },
      "&:hover .tile, &:focus-visible .tile": {
        "--ai-pulse": "1.06",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <rect className="tile t1" x="4" y="4" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2" />
      <rect className="tile t2" x="13" y="4" width="7" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="2" />
      <rect className="tile t3" x="13" y="10.5" width="7" height="9.5" rx="1.8" stroke="currentColor" strokeWidth="2" />
      <rect className="tile t4" x="4" y="13" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="2" />
    </svg>
  </AnimatedIconBase>
);

/* ---------------- Storage / Datasets ---------------- */

export const AnimatedStorage = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .tray": {
        "--ai-nudge-y": "-0.9px",
        animation: "ai-nudge-y 2.2s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "& .t2": { animationDelay: "0.12s" },
      "& .t3": { animationDelay: "0.24s" },
      "&:hover .tray, &:focus-visible .tray": {
        "--ai-nudge-y": "-1.5px",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <path
        className="tray t1"
        d="M6 6.5c0-1 0.8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v1c0 1-.8 1.8-1.8 1.8H7.8C6.8 9.3 6 8.5 6 7.5v-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        className="tray t2"
        d="M6 11.5c0-1 0.8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v1c0 1-.8 1.8-1.8 1.8H7.8c-1 0-1.8-.8-1.8-1.8v-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        className="tray t3"
        d="M6 16.5c0-1 0.8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8v1c0 1-.8 1.8-1.8 1.8H7.8c-1 0-1.8-.8-1.8-1.8v-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  </AnimatedIconBase>
);

/* ---------------- Work history / Jobs ---------------- */

export const AnimatedWorkHistory = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .hand": {
        transformOrigin: "12px 12px",
        animation: "aiwork-hand 2.4s ease-in-out infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "@keyframes aiwork-hand": {
        "0%, 100%": { transform: "rotate(0deg)" },
        "50%": { transform: "rotate(32deg)" },
      },
      "&:hover .hand, &:focus-visible .hand": {
        animationDuration: "1.6s",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21a9 9 0 1 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.12"
      />
      <path
        className="hand"
        d="M12 7v5l3.5 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </AnimatedIconBase>
);

/* ---------------- Settings ---------------- */

export const AnimatedSettings = ({ size = 20, titleAccess = "" }) => (
  <AnimatedIconBase
    size={size}
    titleAccess={titleAccess}
    sx={{
      "& .gear": {
        transformOrigin: "12px 12px",
        animation: "ai-rotate 4.8s linear infinite",
        animationPlayState: "var(--ai-idle)",
      },
      "&:hover .gear, &:focus-visible .gear": {
        animationDuration: "2.8s",
      },
    }}
  >
    <svg viewBox="0 0 24 24" fill="none">
      <g className="gear" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3.5v2" />
        <path d="M12 18.5v2" />
        <path d="M3.5 12h2" />
        <path d="M18.5 12h2" />
        <path d="M5.6 5.6l1.4 1.4" />
        <path d="M17 17l1.4 1.4" />
        <path d="M18.4 5.6L17 7" />
        <path d="M7 17l-1.4 1.4" />
        <circle cx="12" cy="12" r="4.2" />
      </g>
    </svg>
  </AnimatedIconBase>
);

AnimatedChevronLeft.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedChevronRight.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedLogout.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedDashboard.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedStorage.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedWorkHistory.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
AnimatedSettings.propTypes = { size: PropTypes.number, titleAccess: PropTypes.string };
