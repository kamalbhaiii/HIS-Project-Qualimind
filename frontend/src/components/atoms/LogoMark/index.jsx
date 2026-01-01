import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";

const LogoMark = ({ size = 36 }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 2,
        display: "grid",
        placeItems: "center",
        bgcolor: "text.primary",
        color: "background.paper",
        fontFamily: "monospace",
        fontWeight: 900,
        fontSize: Math.round(size * 0.45),
        flex: "0 0 auto",
        userSelect: "none",
      }}
      aria-label="QualiMind logo"
    >
      Q
    </Box>
  );
};

LogoMark.propTypes = {
  size: PropTypes.number,
};

export default LogoMark;
