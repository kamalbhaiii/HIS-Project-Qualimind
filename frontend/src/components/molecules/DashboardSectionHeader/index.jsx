import React from 'react';
import PropTypes from 'prop-types';
import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';

const DashboardSectionHeader = ({ title, subtitle, action }) => {
  return (
    <FlexBox
      sx={{
        mb: subtitle ? 1 : 2,
        display: 'flex',
        alignItems: subtitle ? 'flex-end' : 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <FlexBox>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </FlexBox>
      {action && <FlexBox>{action}</FlexBox>}
    </FlexBox>
  );
};

DashboardSectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  action: PropTypes.node,
};

export default DashboardSectionHeader;
