import React, { createContext, useContext, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";

const BreadcrumbsContext = createContext(null);

export const useBreadcrumbs = () => {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx) throw new Error("useBreadcrumbs must be used inside BreadcrumbsProvider");
  return ctx;
};

// Basic title mapping for static segments
const DEFAULT_TITLES = {
  dashboard: "Dashboard",
  datasets: "Datasets",
  jobs: "Jobs",
  settings: "Settings",
  "dataset-view": "Dataset view",
};

// naive humanize fallback for unknown segments
const humanize = (seg) =>
  decodeURIComponent(seg)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const buildAutoCrumbs = (pathname) => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [];

  const crumbs = [];
  let acc = "";

  parts.forEach((seg, idx) => {
    acc += `/${seg}`;
    const label = DEFAULT_TITLES[seg] || humanize(seg);
    crumbs.push({
      label,
      to: idx === parts.length - 1 ? undefined : acc,
    });
  });

  return crumbs;
};

const BreadcrumbsProvider = ({ children }) => {
  const location = useLocation();

  // page-level override. If null -> use auto crumbs.
  const [override, setOverride] = useState(null);

  const auto = useMemo(() => buildAutoCrumbs(location.pathname), [location.pathname]);
  const items = override ?? auto;

  const value = useMemo(
    () => ({
      items,
      setOverride, // setOverride(array) to set custom crumbs, setOverride(null) to return to auto
    }),
    [items]
  );

  return <BreadcrumbsContext.Provider value={value}>{children}</BreadcrumbsContext.Provider>;
};

BreadcrumbsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BreadcrumbsProvider;
