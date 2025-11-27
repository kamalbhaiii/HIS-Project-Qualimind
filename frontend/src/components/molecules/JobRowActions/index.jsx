// src/components/molecules/JobRowActions.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Button from '../../atoms/CustomButton';
import Icon from '../../atoms/Icon';
import { faBucket, faEye, faRemove, faTrash } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

const JobRowActions = ({ onView, onDelete }) => {

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
      {onView && (
        <Tooltip title='View Job'>
          <IconButton size='small' onClick={onView}/>
          <Icon icon={faEye} size='sm'/>
        </Tooltip>
      )}

      <Tooltip title="Delete Job">
<IconButton
          size="small"
          onClick={onDelete}
        >
          <Icon icon={faTrash} color={'red'} size='sm' />
        </IconButton>
      </Tooltip>
        
    </Box>
  );
};

JobRowActions.propTypes = {
  onView: PropTypes.func,
  onDelete: PropTypes.func,
};

export default JobRowActions;
