// src/components/molecules/StatusFilterChips.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'];

const StatusFilterChips = ({ value, onChange }) => {
  const handleClick = (status) => () => {
    if (onChange) {
      onChange(status);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {STATUS_OPTIONS.map((status) => {
        const isActive = value === status;
        const label =
          status === 'ALL'
            ? 'All'
            : status.charAt(0) + status.slice(1).toLowerCase();

        return (
          <Chip
            key={status}
            label={label}
            size="small"
            variant={isActive ? 'filled' : 'outlined'}
            color={isActive ? 'primary' : 'default'}
            onClick={handleClick(status)}
          />
        );
      })}
    </Box>
  );
};

StatusFilterChips.propTypes = {
  value: PropTypes.oneOf(['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'FAILED'])
    .isRequired,
  onChange: PropTypes.func.isRequired, // (status) => void
};

export default StatusFilterChips;
