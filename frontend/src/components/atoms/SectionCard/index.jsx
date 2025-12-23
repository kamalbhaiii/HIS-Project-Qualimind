import React from 'react';
import PropTypes from 'prop-types';
import FlexBox from '../FlexBox';

export default function SectionCard({ children, sx }) {
  return (
    <FlexBox
      sx={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 2,
        padding: { xs: 1.25, md: 1.5 },
        ...sx,
      }}
    >
      {children}
    </FlexBox>
  );
}

SectionCard.propTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};
