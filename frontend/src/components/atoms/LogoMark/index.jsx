import React from "react";
import Box from "@mui/material/Box";

export default function LogoMark() {
  // Lightweight inline logo (no extra assets). You can replace with your SVG later.
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        display: "grid",
        placeItems: "center",
        bgcolor: "text.primary",
        color: "background.paper",
        fontFamily: "monospace",
        fontWeight: 800,
        fontSize: 18,
        flex: "0 0 auto",
      }}
      aria-label="QualiMind logo"
      title="QualiMind"
    >
      Q
    </Box>
  );
}