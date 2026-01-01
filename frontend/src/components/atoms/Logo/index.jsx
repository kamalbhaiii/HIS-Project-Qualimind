import React from "react";
import PropTypes from "prop-types";

import FlexBox from "../FlexBox";
import Typography from "../CustomTypography";
import LogoMark from "../LogoMark";

const SIZE_MAP = {
  xs: {
    gap: 1,
    markSize: 28,
    textVariant: "subtitle2",
    fontWeight: 700,
  },
  sm: {
    gap: 1.25,
    markSize: 32,
    textVariant: "subtitle1",
    fontWeight: 700,
  },
  md: {
    gap: 1.5,
    markSize: 36,
    textVariant: "h6",
    fontWeight: 800,
  },
  lg: {
    gap: 2,
    markSize: 44,
    textVariant: "h4",
    fontWeight: 900,
  },
};

const Logo = ({
  size = "md",
  showText = true,
  direction = "row",
  muted = false,
  text = "QualiMind",
}) => {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <FlexBox
      sx={{
        display: "flex",
        alignItems: "center",
        flexDirection: direction,
        gap: cfg.gap,
        minWidth: 0,
        opacity: muted ? 0.85 : 1,
      }}
    >
      <LogoMark size={cfg.markSize} />

      {showText && (
        <Typography
          variant={cfg.textVariant}
          sx={{
            fontWeight: cfg.fontWeight,
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {text}
        </Typography>
      )}
    </FlexBox>
  );
};

Logo.propTypes = {
  size: PropTypes.oneOf(["xs", "sm", "md", "lg"]),
  showText: PropTypes.bool,
  direction: PropTypes.oneOf(["row", "column"]),
  muted: PropTypes.bool,
  text: PropTypes.string,
};

export default Logo;
