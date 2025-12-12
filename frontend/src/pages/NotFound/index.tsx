import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import SurfaceCard from "../../components/atoms/SurfaceCard";
import Typography from "../../components/atoms/CustomTypography";
import FlexBox from "../../components/atoms/FlexBox";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

/**
 * PageNotFound (RAFCE)
 * - Theme-aware (uses palette + divider + background)
 * - Animated (subtle gradient, floating card, bouncing 404)
 * - Responsive (stacks nicely on mobile)
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location?.pathname || "/";

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 24px)",
        width: "100%",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, sm: 6 },
        overflow: "hidden",
        position: "relative",

        // Subtle animated background "wash" using theme colors
        background: (theme) =>
          `radial-gradient(1000px 500px at 10% 10%, ${theme.palette.primary.main}14 0%, transparent 60%),
           radial-gradient(900px 480px at 90% 20%, ${theme.palette.secondary.main}12 0%, transparent 55%),
           radial-gradient(700px 380px at 50% 90%, ${theme.palette.info.main}10 0%, transparent 55%),
           linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      {/* Floating blobs */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            width: { xs: 320, sm: 420 },
            height: { xs: 320, sm: 420 },
            borderRadius: "50%",
            filter: "blur(28px)",
            opacity: 0.18,
            animation: "pnfFloat 12s ease-in-out infinite",
          },
          "&::before": {
            left: { xs: "-18%", sm: "-10%" },
            top: { xs: "-16%", sm: "-12%" },
            background: (theme) => theme.palette.primary.main,
          },
          "&::after": {
            right: { xs: "-20%", sm: "-12%" },
            bottom: { xs: "-18%", sm: "-12%" },
            background: (theme) => theme.palette.secondary.main,
            animationDelay: "1.5s",
          },
          "@keyframes pnfFloat": {
            "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
            "50%": { transform: "translate3d(0,18px,0) scale(1.06)" },
          },
        }}
      />

      <SurfaceCard
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          width: "100%",
          maxWidth: 760,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",

          // soft elevation + animation
          boxShadow: (theme) =>
            `0 18px 50px ${theme.palette.common.black}22`,
          animation: "pnfCardIn 520ms cubic-bezier(.2,.8,.2,1) both",

          "@keyframes pnfCardIn": {
            from: { opacity: 0, transform: "translateY(10px) scale(0.985)" },
            to: { opacity: 1, transform: "translateY(0) scale(1)" },
          },
        }}
      >
        {/* Accent top border */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 4,
            width: "100%",
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
        />

        <FlexBox
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
            gap: { xs: 2.5, sm: 3 },
            alignItems: "center",
            minWidth: 0,
          }}
        >
          {/* Left: animated 404 */}
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: { xs: 180, sm: 210 },
                height: { xs: 180, sm: 210 },
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: (theme) =>
                  `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}22 0%, transparent 55%),
                   radial-gradient(circle at 70% 70%, ${theme.palette.secondary.main}1f 0%, transparent 55%),
                   ${theme.palette.background.paper}`,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                animation: "pnfPulse 2.8s ease-in-out infinite",
                "@keyframes pnfPulse": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-6px)" },
                },
              }}
            >
              <Typography
                component="div"
                sx={{
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  fontSize: { xs: 64, sm: 72 },
                  lineHeight: 1,
                  background: (theme) =>
                    `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 10px 30px rgba(0,0,0,0.10)",
                  userSelect: "none",
                }}
              >
                404
              </Typography>

              {/* orbiting dot */}
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: (theme) => theme.palette.primary.main,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  animation: "pnfOrbit 3.4s linear infinite",
                  "@keyframes pnfOrbit": {
                    from: {
                      transform:
                        "translate(-50%, -50%) rotate(0deg) translateX(92px)",
                    },
                    to: {
                      transform:
                        "translate(-50%, -50%) rotate(360deg) translateX(92px)",
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Right: text + actions */}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 0.75,
                letterSpacing: "-0.02em",
              }}
            >
              Page not found
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              The page you requested does not exist, or the link is no longer
              valid.
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  Requested path
                </Typography>
                <Box
                  component="code"
                  sx={{
                    display: "block",
                    width: "100%",
                    maxWidth: "100%",
                    overflowX: "auto",
                    py: 1,
                    px: 1.25,
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    backgroundColor: (theme) =>
                      theme.palette.background.default,
                    fontFamily: "monospace",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {path}
                </Box>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
                sx={{ pt: 0.5 }}
              >
                <Button
                  variant="contained"
                  onClick={() => navigate("/sign-in", { replace: true })}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Go to sign in
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => navigate(-1)}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Go back
                </Button>

                <Button
                  variant="text"
                  onClick={() => navigate("/", { replace: true })}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Home
                </Button>
              </Stack>
            </Stack>
          </Box>
        </FlexBox>
      </SurfaceCard>
    </Box>
  );
};

NotFound.propTypes = {};

export default NotFound;
