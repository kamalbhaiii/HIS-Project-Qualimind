import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

// Use your atom
import Icon from "../../atoms/Icon";

// FontAwesome icons
import { faEye, faTrash } from "@fortawesome/free-solid-svg-icons";

const DatasetRowActions = ({ status, onView, onDelete }) => {
  const isSuccess = status === "SUCCESS";

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* Show View ONLY if SUCCESS */}
      {isSuccess && (
        <Tooltip title="View Dataset">
          <IconButton size="small" onClick={onView}>
          <Icon icon={faEye} color={'blue'} size="sm" />
        </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Delete Dataset">
        <IconButton size="small" onClick={onDelete} color="error">
        <Icon icon={faTrash} color={'red'} size="sm" />
      </IconButton>
      </Tooltip>
    </Box>
  );
};

DatasetRowActions.propTypes = {
  status: PropTypes.string,
  onView: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
};

export default DatasetRowActions;
