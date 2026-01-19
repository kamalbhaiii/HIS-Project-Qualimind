import React from 'react';
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import FlexBox from '../FlexBox';
import Typography from '../CustomTypography';

export default function JsonCodeEditor({
  label,
  value,
  onChange,
  error,
  helperText,
  minRows = 10,
  disabled = false,
}) {
  return (
    <FlexBox sx={{ flexDirection: 'column', gap: 0.75 }}>
      {label ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
      ) : null}

      <TextField
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        multiline
        minRows={minRows}
        fullWidth
        error={Boolean(error)}
        helperText={error || helperText}
        placeholder='{\n  "version": "1.0",\n  "steps": []\n}'
        InputProps={{
          sx: {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12.5,
            lineHeight: 1.5,
          },
        }}
      />
    </FlexBox>
  );
}

JsonCodeEditor.propTypes = {
  label: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  helperText: PropTypes.string,
  minRows: PropTypes.number,
  disabled: PropTypes.bool,
};
