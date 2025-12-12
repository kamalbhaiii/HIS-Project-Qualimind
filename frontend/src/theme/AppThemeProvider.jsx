import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const LS_KEY = "qm.pref.darkMode";

const readLSBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
};

const AppThemeContext = createContext(null);
export const useAppTheme = () => useContext(AppThemeContext);

const AppThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => readLSBool(LS_KEY, false));

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, String(darkMode));
    } catch {
      /* ignore */
    }
  }, [darkMode]);

  const theme = useMemo(() => {
    const fontStack = [
      "Fira Code",
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "Monaco",
      "Consolas",
      '"Liberation Mono"',
      '"Courier New"',
      "monospace",
    ].join(",");

    return createTheme({
      palette: {
        mode: darkMode ? "dark" : "light",
      },
      shape: { borderRadius: 12 },

      typography: {
        fontFamily: fontStack,
        // Optional: MUI default buttons are uppercase; usually looks harsh with monospace
        button: {
          textTransform: "none",
          fontWeight: 600,
        },
      },

      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: {
              fontFamily: fontStack,
            },
            body: {
              fontFamily: fontStack,
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              // Optional: disable ligatures globally (enable if you don't want => turning into glyphs)
              // fontVariantLigatures: "none",
            },
            "#root": {
              fontFamily: fontStack,
            },
            code: {
              fontFamily: fontStack,
            },
            pre: {
              fontFamily: fontStack,
            },
          },
        },
      },
    });
  }, [darkMode]);

  const value = useMemo(() => ({ darkMode, setDarkMode }), [darkMode]);

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
};

AppThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppThemeProvider;
