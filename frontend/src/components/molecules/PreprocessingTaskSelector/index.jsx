import React from 'react';
import PropTypes from 'prop-types';

import FlexBox from '../../atoms/FlexBox';
import Typography from '../../atoms/CustomTypography';
import ToggleChip from '../../atoms/ToggleChip';

const PreprocessingTaskSelector = ({
  tasks,
  selectedTaskKeys,
  onToggleTask,
}) => {
  if (!tasks || tasks.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No preprocessing tasks are available.
      </Typography>
    );
  }

  return (
    <FlexBox sx={{ flexDirection: 'column' }}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
        Choose one or more preprocessing operations to run on this dataset.
      </Typography>

      <FlexBox sx={{ flexWrap: 'wrap' }}>
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

      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
        These are mock options for now; later they will map to real
        preprocessing operations on the backend.
      </Typography>
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
