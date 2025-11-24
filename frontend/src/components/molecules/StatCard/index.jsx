import React from 'react';
import PropTypes from 'prop-types';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';

const StatCard = ({ label, value, helperText }) => {
  return (
    <SurfaceCard sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ mt: 1, mb: helperText ? 0.5 : 0 }}>
        {value}
      </Typography>
      {helperText && (
        <Typography variant="body2" color="textSecondary">
          {helperText}
        </Typography>
      )}
    </SurfaceCard>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helperText: PropTypes.string,
};

export default StatCard;
