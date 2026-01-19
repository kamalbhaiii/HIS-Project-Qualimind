import React from 'react';
import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import FlexBox from '../../atoms/FlexBox';
import Button from '../../atoms/CustomButton';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const DatasetUploadPanel = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  const handleGoToUploadPage = () => {
    navigate('/dataset-upload');
  };

  return (
    <SurfaceCard
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: 2,
        width: '100%',
        minWidth: 0,
        height: 'fit-content',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' },
        }}
      >
        Upload new dataset
      </Typography>

      <Typography
        variant="body2"
        color="textSecondary"
        sx={{
          mb: 2,
          lineHeight: 1.5,
        }}
      >
        Supported formats: CSV (recommended), JSON, Excel. The file will be
        validated and prepared for preprocessing.
      </Typography>

      <FlexBox sx={{ mb: 1.5 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGoToUploadPage}
          fullWidth={isSmDown}
          sx={{
            alignSelf: isSmDown ? 'stretch' : 'flex-start',
            px: { xs: 2, sm: 3 },
            py: 1,
            fontWeight: 600,
          }}
        >
          Upload dataset
        </Button>
      </FlexBox>

      <Typography
        variant="caption"
        color="textSecondary"
        sx={{
          display: 'block',
          lineHeight: 1.4,
        }}
      >
        Tip: Use well-structured column headers for better categorical
        preprocessing.
      </Typography>
    </SurfaceCard>
  );
};

export default DatasetUploadPanel;
