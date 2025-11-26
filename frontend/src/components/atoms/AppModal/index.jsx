import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const AppModal = ({ open, title, onClose, children, maxWidth }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth || 'md'}
      fullWidth
    >
      {title && (
        <DialogTitle
          sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}
        >
          <span style={{ flex: 1 }}>{title}</span>
          {onClose && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}
      <DialogContent dividers>{children}</DialogContent>
    </Dialog>
  );
};

AppModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.node,
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

export default AppModal;
