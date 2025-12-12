import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";

import SurfaceCard from "../../components/atoms/SurfaceCard";
import SidebarNav from "../../components/organisms/SideBarNav";

import Logo from "../../components/atoms/Logo";
import LogoImage from "../../assets/logo.png";

import { getToken, saveAuth } from "../../lib/authStorage";
import AccountVerificationBar from "../../components/molecules/AccountVerificationBar";
import { useToast } from "../../components/organisms/ToastProvider";

import { getMe, resendVerificationMail } from "../../services/modules/auth.api";
import { getJobs } from "../../services/modules/job.api";
import { getDatasets } from "../../services/modules/dataset.api";

import { getSocket } from "../../services/realtime/socket";

// ✅ Animated icons
import {
  AnimatedDashboard,
  AnimatedStorage,
  AnimatedWorkHistory,
  AnimatedSettings,
} from "../../components/atoms/AnimatedIcons";

export const DashboardContext = createContext(null);
export const useDashboard = () => useContext(DashboardContext);

const LS_KEYS = {
  collapsed: "qm.sidebar.collapsed",
};

const readLSBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "true";
  } catch {
    return fallback;
  }
};

const DashboardLayout = ({ children }) => {
  const [showVerificationBar, setShowVerificationBar] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [me, setMe] = useState();
  const [jobs, setJobs] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readLSBool(LS_KEYS.collapsed, true)
  );

  const { showToast } = useToast();
  const showToastRef = useRef(showToast);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.collapsed, String(sidebarCollapsed));
    } catch {}
  }, [sidebarCollapsed]);

  /* ---------------- User ---------------- */

  useEffect(() => {
    let cancelled = false;

    const fetchMe = async () => {
      try {
        const token = getToken();
        const user = await getMe();
        if (cancelled) return;

        setMe(user);

        if (user?.emailVerified === false) {
          saveAuth({ token, user });
          setShowVerificationBar(true);
        } else {
          setShowVerificationBar(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load user information";
          setError(msg);
          showToastRef.current?.(msg, "error");
        }
      }
    };

    fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Initial data ---------------- */

  useEffect(() => {
    if (!me?.id) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [jobsRes, datasetsRes] = await Promise.all([getJobs(), getDatasets()]);

        if (!cancelled) {
          setJobs(jobsRes || []);
          setDatasets(datasetsRes || []);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || "Failed to load dashboard data";
          setError(msg);
          showToastRef.current?.(msg, "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  /* ---------------- Realtime updates ---------------- */

  useEffect(() => {
    if (!me?.id) return;
    if (!getToken()) return;

    const socket = getSocket();

    const onJobUpdate = (evt) => {
      if (evt.status === "RUNNING") {
        showToastRef.current?.("Preprocessing started…", "info");
      }
      if (evt.status === "SUCCESS") {
        showToastRef.current?.("Dataset preprocessing completed.", "success");
      }
      if (evt.status === "FAILED") {
        showToastRef.current?.(evt.message || "Dataset preprocessing failed.", "error");
      }

      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === evt.jobId);
        if (idx === -1) {
          return [{ id: evt.jobId, datasetId: evt.datasetId, status: evt.status }, ...prev];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], status: evt.status };
        return next;
      });

      setDatasets((prev) => {
        const idx = prev.findIndex((d) => d.id === evt.datasetId);
        if (idx === -1) return prev;

        const current = prev[idx];
        const nextJob = current.job
          ? { ...current.job, status: evt.status }
          : { id: evt.jobId, status: evt.status };

        const next = [...prev];
        next[idx] = { ...current, job: nextJob };
        return next;
      });
    };

    socket.on("job:update", onJobUpdate);

    return () => {
      socket.off("job:update", onJobUpdate);
    };
  }, [me?.id]);

  /* ---------------- UI ---------------- */

  const navItems = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", icon: <AnimatedDashboard />, to: "/dashboard" },
      { key: "datasets", label: "Datasets", icon: <AnimatedStorage />, to: "/datasets" },
      { key: "jobs", label: "Jobs", icon: <AnimatedWorkHistory />, to: "/jobs" },
      { key: "settings", label: "Settings", icon: <AnimatedSettings />, to: "/settings" },
    ],
    []
  );

  return (
    <DashboardContext.Provider
      value={{
        me,
        setMe,
        jobs,
        setJobs,
        datasets,
        setDatasets,
        loading,
        setLoading,
        error,
        setError,
        sidebarCollapsed,
        setSidebarCollapsed,
      }}
    >
      <CssBaseline />
      <GlobalStyles
        styles={{
          "html, body, #root": {
            height: "100%",
            overflow: "hidden",
          },
        }}
      />

      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <SidebarNav
          items={navItems}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          headerContentExpanded={<Logo size={32} src={LogoImage} />}
        />

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
            {showVerificationBar && (
              <AccountVerificationBar
                onVerifyClick={async () => {
                  try {
                    setVerifyLoading(true);
                    await resendVerificationMail();
                    showToastRef.current?.("Verification email sent.", "success");
                  } catch {
                    showToastRef.current?.("Failed to send verification email.", "error");
                  } finally {
                    setVerifyLoading(false);
                  }
                }}
                loading={verifyLoading}
              />
            )}

            <SurfaceCard sx={{ p: 3 }}>{children}</SurfaceCard>
          </Box>
        </Box>
      </Box>
    </DashboardContext.Provider>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DashboardLayout;
