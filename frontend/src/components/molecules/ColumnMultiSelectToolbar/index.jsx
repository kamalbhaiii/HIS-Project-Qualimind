import React from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import Button from '../../atoms/CustomButton';

function SelectNative({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        width: '100%',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function InputNative({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.15)',
        width: '100%',
        outline: 'none',
      }}
    />
  );
}

export default function ColumnMultiSelectToolbar({
  search,
  onSearch,
  filterType,
  onFilterType,
  onSelectAllFiltered,
  onClearSelection,
  selectedCount,
}) {
  return (
    <FlexBox
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 200px auto auto' },
        gap: 1,
        alignItems: 'center',
      }}
    >
      <InputNative value={search} onChange={onSearch} placeholder="Search columns..." />

      <SelectNative
        value={filterType}
        onChange={onFilterType}
        options={[
          { key: 'all', label: 'All types' },
          { key: 'numeric', label: 'Numeric' },
          { key: 'categorical', label: 'Categorical' },
        ]}
      />

      <Button variant="outlined" color="inherit" onClick={onSelectAllFiltered}>
        Select all filtered
      </Button>

      <FlexBox sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="textSecondary">
          {selectedCount} selected
        </Typography>
        <Button variant="outlined" color="inherit" onClick={onClearSelection}>
          Clear
        </Button>
      </FlexBox>
    </FlexBox>
  );
}

ColumnMultiSelectToolbar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  filterType: PropTypes.string.isRequired,
  onFilterType: PropTypes.func.isRequired,
  onSelectAllFiltered: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
  selectedCount: PropTypes.number.isRequired,
};
