// src/components/atoms/AppModal.jsx
import React from "react";
import PropTypes from "prop-types";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const AppModal = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  maxWidth,
  disableBackdropClose,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const handleClose = (event, reason) => {
    // Avoid accidental dismiss when user is editing large configs
    if (disableBackdropClose && (reason === "backdropClick" || reason === "escapeKeyDown")) return;
    if (onClose) onClose(event, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth || "md"}
      fullWidth
      fullScreen={fullScreen}
    >
      {(title || onClose) && (
        <DialogTitle
          sx={{
            m: 0,
            px: 2,
            py: 1.75,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {title}
              </Typography>
            ) : null}

            {subtitle ? (
              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>

          {onClose ? (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ color: (t) => t.palette.grey[500] }}
            >
              <CloseIcon />
            </IconButton>
          ) : null}
        </DialogTitle>
      )}

      <DialogContent dividers sx={{ p: 2 }}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

AppModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.node,
  subtitle: PropTypes.node,
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  disableBackdropClose: PropTypes.bool,
};

AppModal.defaultProps = {
  title: null,
  subtitle: null,
  onClose: undefined,
  maxWidth: "md",
  disableBackdropClose: false,
};

export default AppModal;
