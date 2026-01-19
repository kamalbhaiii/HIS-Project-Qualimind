// components/organisms/OverrideConfirmModal.jsx
import React from 'react';
import PropTypes from 'prop-types';

import AppModal from '../../atoms/AppModal';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';

export default function OverrideConfirmModal({
  open,
  onClose,
  onConfirm,
  conflicts, // [{ column, fields: ['scaling','categoricalMissing', ...] }]
}) {
  return (
    <AppModal open={open} title="Override existing settings?" onClose={onClose} maxWidth="sm">
      <FlexBox sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography variant="body2" color="textSecondary">
          You are about to overwrite existing per-column settings for the following columns.
        </Typography>

        <FlexBox
          sx={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 2,
            padding: 1.25,
            maxHeight: 260,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.02)',
          }}
        >
          {conflicts.map((c) => (
            <FlexBox key={c.column} sx={{ flexDirection: 'column', gap: 0.25, mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {c.column}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Overridden fields: {c.fields.join(', ')}
              </Typography>
            </FlexBox>
          ))}
        </FlexBox>

        <FlexBox sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={onConfirm}>
            Override
          </Button>
        </FlexBox>
      </FlexBox>
    </AppModal>
  );
}

OverrideConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  conflicts: PropTypes.arrayOf(
    PropTypes.shape({
      column: PropTypes.string.isRequired,
      fields: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
};
