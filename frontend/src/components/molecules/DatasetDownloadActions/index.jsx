    // src/components/molecules/DatasetDownloadActions.jsx
import React from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";

import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import DownloadIcon from "@mui/icons-material/Download";

const DatasetDownloadActions = ({
  disabled,
  onDownloadCsv,
  onDownloadJson,
}) => {
  return (
    <FlexBox sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" color="textSecondary">
        Download:
      </Typography>
      <ButtonGroup size="small" variant="outlined">
        <Button
          startIcon={<DownloadIcon />}
          disabled={disabled}
          onClick={onDownloadCsv}
        >
          CSV
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          disabled={disabled}
          onClick={onDownloadJson}
        >
          JSON
        </Button>
      </ButtonGroup>
    </FlexBox>
  );
};

DatasetDownloadActions.propTypes = {
  disabled: PropTypes.bool,
  onDownloadCsv: PropTypes.func.isRequired,
  onDownloadJson: PropTypes.func.isRequired,
};

export default DatasetDownloadActions;
