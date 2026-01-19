import React from "react";
import PropTypes from "prop-types";
import SurfaceCard from "../../atoms/SurfaceCard";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Skeleton from "@mui/material/Skeleton";

const ChartCard = ({ title, subtitle, loading, children, footer, sx }) => {
  return (
    <SurfaceCard
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        minWidth: 0,
        width: "100%",
        ...sx,
      }}
    >
      <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        ) : null}
      </FlexBox>

      {loading ? (
        <>
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
          <Skeleton variant="text" width="70%" sx={{ mt: 1 }} />
        </>
      ) : (
        children
      )}

      {footer ? (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1.5, display: "block" }}>
          {footer}
        </Typography>
      ) : null}
    </SurfaceCard>
  );
};

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  loading: PropTypes.bool,
  children: PropTypes.node,
  footer: PropTypes.string,
  sx: PropTypes.object,
};

ChartCard.defaultProps = {
  subtitle: "",
  loading: false,
  children: null,
  footer: "",
  sx: {},
};

export default ChartCard;
