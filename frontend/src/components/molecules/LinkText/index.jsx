import React from 'react';
import Typography from '../../atoms/CustomTypography';
import Link from '@mui/material/Link';
import PropTypes from 'prop-types';

const LinkText = ({ children, href, onClick, variant = 'body2', color = 'primary', ...rest }) => {
  return (
    <Typography variant={variant} color="textSecondary" {...rest}>
      <Link
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick(e);
          }
        }}
        underline="hover"
        sx={{
          cursor: onClick ? 'pointer' : 'auto',
          fontWeight: 500,
        }}
        color={color}
      >
        {children}
      </Link>
    </Typography>
  );
};

LinkText.propTypes = {
  children: PropTypes.node.isRequired,
  href: PropTypes.string,
  onClick: PropTypes.func,
  variant: PropTypes.string,
  color: PropTypes.string,
};

export default LinkText;
