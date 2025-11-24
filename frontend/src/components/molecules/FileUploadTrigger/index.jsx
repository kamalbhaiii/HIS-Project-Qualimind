import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '../../atoms/CustomButton';
import Typography from '../../atoms/CustomTypography';

const FileUploadTrigger = ({ onFilesSelected, accept, helperText }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFilesSelected) {
      onFilesSelected(Array.from(files));
    }
    // Reset so selecting the same file again still triggers onChange
    e.target.value = '';
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={false}
        accept={accept}
        onChange={handleChange}
      />
      <Button variant="contained" color="primary" onClick={handleClick}>
        Upload dataset
      </Button>
      {helperText && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mt: 1 }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

FileUploadTrigger.propTypes = {
  onFilesSelected: PropTypes.func, // (files: File[]) => void
  accept: PropTypes.string,
  helperText: PropTypes.string,
};

FileUploadTrigger.defaultProps = {
  accept: '.csv,.json,.txt',
};

export default FileUploadTrigger;
