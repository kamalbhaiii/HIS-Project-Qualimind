import React from 'react';
import PropTypes from 'prop-types';
import SvgIcon from '@mui/material/SvgIcon';

export const EmailIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" >
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 
      2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 
      8-5v2z"/>
  </SvgIcon>
);

export const LockIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" >
    <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 
      4zm6-6h-1V7a5 5 0 0 0-10 0v4H6a2 2 0 0 0-2 
      2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 
      0-2-2zm-7-4a3 3 0 0 1 6 0v4H11V7z"/>
  </SvgIcon>
);

export const LogoIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" >
    {/* Simplified logo shape from image – adjust paths as needed */}
    <circle cx="12" cy="12" r="10" fill="#1976D2" />
    <path fill="#fff" d="M9 7h2v10H9zM13 7h2v10h-2z" />
  </SvgIcon>
);

export const UserIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    {/* Head */}
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4
             -4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-6 2.69-6 
             6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z" />
  </SvgIcon>
);

EmailIcon.propTypes = LockIcon.propTypes = LogoIcon.propTypes = {
  fontSize: PropTypes.oneOf(['small', 'inherit', 'large', 'medium']),
  color: PropTypes.string,
};
