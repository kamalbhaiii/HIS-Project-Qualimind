import React from 'react';
import PropTypes from 'prop-types';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const PaginationControl = ({ page, pageCount, onChange }) => {
  // Hide pagination if there’s only one page
  if (pageCount <= 1) return null;

  return (
    <Stack
      direction="row"
      justifyContent="flex-end"
      alignItems="center"
      sx={{ mt: 2 }}
    >
      <Pagination
        page={page}
        count={pageCount}
        onChange={(_, value) => onChange(value)}
        size="small"
        color="primary"
      />
    </Stack>
  );
};

PaginationControl.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired, // (page: number) => void
};

export default PaginationControl;
