// src/components/organisms/Step3CorrelationOrchestrator.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import CorrelationConfigForm from "../../molecules/CorrelationConfigForm";

const Step3CorrelationOrchestrator = ({
  columnTypes,

  correlationValue,
  onCorrelationChange,

  // preprocessing editor shared props
  livePreprocessingConfig,
  preprocessingConfigEffective,
  setPreprocessingConfigEffective,
  validatePreprocessingConfig,
  useCustomConfig,
  setUseCustomConfig,
  customConfigText,
  setCustomConfigText,
  setCustomConfigParsed,
  customConfigError,
  setCustomConfigError,
}) => {
  const numericCols = useMemo(() => {
    if (!columnTypes || typeof columnTypes !== "object") return [];
    return Object.entries(columnTypes)
      .filter(([, t]) => String(t).toLowerCase() === "numeric")
      .map(([col]) => col);
  }, [columnTypes]);

  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FlexBox
        sx={{
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          padding: 1.5,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        <Typography variant="body2" color="textSecondary">
          Correlation is optional. If enabled, it runs on the selected numeric columns and is saved into job metadata
          for visualization in Dataset View. Preprocessing config is shared with Step-2.
        </Typography>
      </FlexBox>

      <CorrelationConfigForm
        numericColumns={numericCols}
        value={correlationValue}
        onChange={onCorrelationChange}
        livePreprocessingConfig={livePreprocessingConfig}
        preprocessingConfigEffective={preprocessingConfigEffective}
        setPreprocessingConfigEffective={setPreprocessingConfigEffective}
        validatePreprocessingConfig={validatePreprocessingConfig}
        useCustomConfig={useCustomConfig}
        setUseCustomConfig={setUseCustomConfig}
        customConfigText={customConfigText}
        setCustomConfigText={setCustomConfigText}
        setCustomConfigParsed={setCustomConfigParsed}
        customConfigError={customConfigError}
        setCustomConfigError={setCustomConfigError}
      />
    </FlexBox>
  );
};

Step3CorrelationOrchestrator.propTypes = {
  columnTypes: PropTypes.object,

  correlationValue: PropTypes.object.isRequired,
  onCorrelationChange: PropTypes.func.isRequired,

  livePreprocessingConfig: PropTypes.object,
  preprocessingConfigEffective: PropTypes.object,
  setPreprocessingConfigEffective: PropTypes.func.isRequired,
  validatePreprocessingConfig: PropTypes.func.isRequired,

  useCustomConfig: PropTypes.bool.isRequired,
  setUseCustomConfig: PropTypes.func.isRequired,
  customConfigText: PropTypes.string.isRequired,
  setCustomConfigText: PropTypes.func.isRequired,
  setCustomConfigParsed: PropTypes.func.isRequired,
  customConfigError: PropTypes.string,
  setCustomConfigError: PropTypes.func.isRequired,
};

Step3CorrelationOrchestrator.defaultProps = {
  columnTypes: {},
  livePreprocessingConfig: null,
  preprocessingConfigEffective: null,
  customConfigError: null,
};

export default Step3CorrelationOrchestrator;
