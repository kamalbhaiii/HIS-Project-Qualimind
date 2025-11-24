import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import SurfaceCard from '../../atoms/SurfaceCard';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';
import FlexBox from '../../atoms/FlexBox';

const DragAndDropUploadArea = ({
  onFilesSelected,
  accept,
  helperText,
}) => {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setSelectedFileName(files[0].name);
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  };

  const handleChange = (e) => {
    handleFiles(e.target.files);
    // reset so same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <SurfaceCard sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Upload dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Drag and drop your dataset file here, or select it from your
        computer. Supported formats: CSV, JSON, TXT.
      </Typography>

      <Box
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.default',
          transition: 'background-color 0.2s, border-color 0.2s',
        }}
      >
        <FlexBox
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <CloudUploadIcon fontSize="large" color="primary" />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            Drag & drop your file here
          </Typography>
          <Typography variant="body2" color="textSecondary">
            or click to browse your local files
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            sx={{ mt: 1 }}
            onClick={handleClick}
          >
            Choose file
          </Button>
        </FlexBox>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          onChange={handleChange}
        />
      </Box>

      {helperText && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mt: 2 }}
        >
          {helperText}
        </Typography>
      )}

      {selectedFileName && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Selected file: <strong>{selectedFileName}</strong>
        </Typography>
      )}
    </SurfaceCard>
  );
};

DragAndDropUploadArea.propTypes = {
  onFilesSelected: PropTypes.func.isRequired, // (files: File[]) => void
  accept: PropTypes.string,
  helperText: PropTypes.string,
};

DragAndDropUploadArea.defaultProps = {
  accept: '.csv,.json,.txt',
};

export default DragAndDropUploadArea;
