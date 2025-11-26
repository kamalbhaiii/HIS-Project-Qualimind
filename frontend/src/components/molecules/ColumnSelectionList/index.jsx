import React from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import CustomCheckbox from '../../atoms/CustomCheckbox';

const ColumnSelectionList = ({
  columns,
  selectedColumns,
  onToggleColumn,
}) => {
  if (!columns || columns.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No columns detected in this file.
      </Typography>
    );
  }

  return (
    <FlexBox
      sx={{
        maxHeight: 260,
        overflowY: 'auto',
        flexDirection: 'column',
      }}
    >
      {columns.map((col) => {
        const isChecked = selectedColumns.includes(col);
        return (
          <CustomCheckbox
            key={col}
            label={col}
            checked={isChecked}
            onChange={() => onToggleColumn(col)}
          />
        );
      })}
    </FlexBox>
  );
};

ColumnSelectionList.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleColumn: PropTypes.func.isRequired,
};

export default ColumnSelectionList;
