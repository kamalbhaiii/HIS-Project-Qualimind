// atoms/Icon.jsx
import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Icon = ({ icon, size = "sm", color }) => (
  <FontAwesomeIcon icon={icon} size={size} color={color} />
);

Icon.propTypes = {
  icon: PropTypes.any.isRequired,
  size: PropTypes.oneOf(["xs", "sm", "lg"]),
  color: PropTypes.string,
};

export default Icon;
