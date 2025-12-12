import React from 'react';
import PropTypes from 'prop-types';
import MuiAvatar from '@mui/material/Avatar';

/**
 * Atomic Avatar component (wrapper around MUI Avatar)
 * - Supports initials fallback via `name`
 * - Supports `src` for profile image
 */
const Avatar = ({ name, src, size = 40, ...rest }) => {
  const initials =
    typeof name === 'string' && name.trim().length > 0
      ? name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase())
          .join('')
      : undefined;

  return (
    <MuiAvatar
      src={src || undefined}
      alt={name || 'User'}
      sx={{ width: size, height: size }}
      {...rest}
    >
      {!src ? initials : null}
    </MuiAvatar>
  );
};

Avatar.propTypes = {
  name: PropTypes.string,
  src: PropTypes.string,
  size: PropTypes.number,
};

export default Avatar;
