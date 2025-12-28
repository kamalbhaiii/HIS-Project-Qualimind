import React from "react";
import PropTypes from "prop-types";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";

const WizardStepShell = ({ title, stepLabel, step, children }) => {
  return (
    <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <FlexBox
        sx={{
          gap: 1,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 2,
          padding: 1.5,
        }}
      >
        <FlexBox sx={{ flexDirection: "column", gap: 0.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {stepLabel}
          </Typography>
        </FlexBox>

        <FlexBox sx={{ gap: 1, alignItems: "center", minWidth: 180 }}>
          <FlexBox
            sx={{
              height: 8,
              borderRadius: 999,
              background: "rgba(0,0,0,0.08)",
              overflow: "hidden",
              flex: 1,
              minWidth: 140,
            }}
          >
            <FlexBox
              sx={{
                width: step === 0 ? "33%" : step === 1 ? "66%" : "100%",
                background: "rgba(0,0,0,0.35)",
                height: "100%",
              }}
            />
          </FlexBox>
          <Typography variant="caption" color="textSecondary">
            {step === 0 ? "33%" : step === 1 ? "66%" : "100%"}
          </Typography>
        </FlexBox>
      </FlexBox>

      {children}
    </FlexBox>
  );
};

WizardStepShell.propTypes = {
  title: PropTypes.string.isRequired,
  stepLabel: PropTypes.string.isRequired,
  step: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};

export default WizardStepShell;
