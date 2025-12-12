import React from "react";
import PropTypes from "prop-types";
import { Link as RouterLink } from "react-router-dom";

import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const AppBreadcrumbs = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <Box sx={{ mb: 2, minWidth: 0 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ color: "text.secondary" }}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          if (isLast) {
            return (
              <Typography
                key={item.to || item.label || idx}
                color="text.primary"
                sx={{
                  fontWeight: 700,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.label}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.to || item.label || idx}
              component={RouterLink}
              to={item.to}
              underline="hover"
              color="inherit"
              sx={{
                fontWeight: 600,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={item.label}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

AppBreadcrumbs.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string, // optional for last item
    })
  ),
};

AppBreadcrumbs.defaultProps = {
  items: [],
};

export default AppBreadcrumbs;
