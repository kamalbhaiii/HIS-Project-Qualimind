import React from "react";
import PropTypes from "prop-types";
import SurfaceCard from "../../atoms/SurfaceCard";
import FlexBox from "../../atoms/FlexBox";
import Typography from "../../atoms/CustomTypography";
import Skeleton from "@mui/material/Skeleton";

const InsightCard = ({ title, subtitle, loading, children, sx }) => {
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
      <FlexBox sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5 }}>
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
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1, mt: 1 }} />
        </>
      ) : (
        children
      )}
    </SurfaceCard>
  );
};

InsightCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  loading: PropTypes.bool,
  children: PropTypes.node,
  sx: PropTypes.object,
};

InsightCard.defaultProps = {
  subtitle: "",
  loading: false,
  children: null,
  sx: {},
};

export default InsightCard;
