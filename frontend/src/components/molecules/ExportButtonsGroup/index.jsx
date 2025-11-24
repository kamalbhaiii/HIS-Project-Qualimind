import React from 'react';
import PropTypes from 'prop-types';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '../../atoms/CustomButton';

const ExportButtonsGroup = ({ onExport }) => {
  const handleClick = (format) => () => {
    if (onExport) {
      onExport(format);
    }
  };

  return (
    <ButtonGroup variant="outlined" size="small">
      <Button onClick={handleClick('json')}>JSON</Button>
      <Button onClick={handleClick('csv')}>CSV</Button>
      <Button onClick={handleClick('txt')}>TXT</Button>
    </ButtonGroup>
  );
};

ExportButtonsGroup.propTypes = {
  // format: 'json' | 'csv' | 'txt'
  onExport: PropTypes.func.isRequired,
};

export default ExportButtonsGroup;
