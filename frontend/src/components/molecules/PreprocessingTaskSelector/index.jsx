import React from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import ToggleChip from '../../atoms/ToggleChip';

const PreprocessingTaskSelector = ({ tasks, selectedTaskKeys, onToggleTask }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No preprocessing tasks are available.
      </Typography>
    );
  }

  return (
    <FlexBox sx={{ flexDirection: 'column', gap: 1 }}>
      <Typography variant="body2" color="textSecondary">
        Choose one or more preprocessing operations to run on this dataset.
      </Typography>

      <FlexBox
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {tasks.map((task) => {
          const isSelected = selectedTaskKeys.includes(task.key);
          return (
            <ToggleChip
              key={task.key}
              label={task.label}
              selected={isSelected}
              onClick={() => onToggleTask(task.key)}
            />
          );
        })}
      </FlexBox>

      <FlexBox
        sx={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 2,
          padding: 1,
          background: 'rgba(0,0,0,0.02)',
        }}
      >
        <Typography variant="caption" color="textSecondary">
          These are mock options for now; later they will map to real preprocessing operations on the backend.
        </Typography>
      </FlexBox>
    </FlexBox>
  );
};

PreprocessingTaskSelector.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  selectedTaskKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggleTask: PropTypes.func.isRequired,
};

export default PreprocessingTaskSelector;
