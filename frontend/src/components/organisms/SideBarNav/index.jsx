import React from "react";
import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";

import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

import Avatar from "../../atoms/Avatar";
import ThemeModeSwitch from "../../atoms/ThemeModeSwitch";

import { useDashboard } from "../../../layouts/DashboardLayout";
import { useAppTheme } from "../../../theme/AppThemeProvider";
import { clearAuth } from "../../../lib/authStorage";
import { useToast } from "../ToastProvider";

import {
  AnimatedChevronLeft,
  AnimatedChevronRight,
  AnimatedLogout,
} from "../../atoms/AnimatedIcons";

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 72;

const SidebarNav = ({ items, collapsed, onToggleCollapse, headerContentExpanded }) => {
  const drawerWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const navigate = useNavigate();
  const { showToast } = useToast();

  const { me } = useDashboard();
  const { darkMode, setDarkMode } = useAppTheme();

  const userName = me?.name || "John Doe";
  const userAvatarSrc = null;

  const handleSignOut = () => {
    try {
      clearAuth();
      showToast?.("You have been logged out.", "success");
      navigate("/sign-in", { replace: true });
    } catch {
      showToast?.("Error during logout. Please try again.", "error");
    }
  };

  const content = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{
          mt: 1,
          mx: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 52,
        }}
      >
        {collapsed ? (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              border: (t) => `1px solid ${t.palette.divider}`,
              bgcolor: "background.paper",
              userSelect: "none",
            }}
          >
            <Typography sx={{ fontWeight: 800, lineHeight: 1 }}>Q</Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minWidth: 0 }}>{headerContentExpanded}</Box>
        )}

        <IconButton
          aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
          onClick={onToggleCollapse}
          size="small"
          sx={{ ml: collapsed ? 0 : 1 }}
        >
          {collapsed ? <AnimatedChevronRight size={18} /> : <AnimatedChevronLeft size={18} />}
        </IconButton>
      </Box>

      <Divider sx={{ mt: 1 }} />

      {/* Nav */}
      <List sx={{ mt: 1, px: 1 }}>
        {items.map((item) => {
          const button = (
            <ListItemButton
              component={NavLink}
              to={item.to}
              sx={{
                borderRadius: 2,
                py: 1.1,
                justifyContent: collapsed ? "center" : "flex-start",
                "&.active": (theme) => ({
                  bgcolor: theme.palette.action.selected,
                }),
              }}
            >
              {item.icon && (
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 40,
                    mr: collapsed ? 0 : 1,
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              )}

              <ListItemText
                primary={item.label}
                sx={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition: (t) =>
                    t.transitions.create(["opacity", "width"], {
                      duration: t.transitions.duration.shorter,
                    }),
                }}
              />
            </ListItemButton>
          );

          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
              {collapsed ? (
                <Tooltip title={item.label} placement="right" arrow>
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ flex: 1 }} />

      <Divider />

      {/* Bottom controls */}
      <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
        {/* Dark mode switch (keep as-is) */}
        {collapsed ? (
          <Tooltip
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            placement="right"
            arrow
          >
            <Box>
              <ThemeModeSwitch checked={darkMode} onChange={setDarkMode} collapsed />
            </Box>
          </Tooltip>
        ) : (
          <ThemeModeSwitch checked={darkMode} onChange={setDarkMode} />
        )}

        {/* Sign out */}
        <Box
          sx={{
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 0 : 1,
          }}
        >
          {collapsed ? (
            <Tooltip title="Sign out" placement="right" arrow>
              <IconButton aria-label="sign out" onClick={handleSignOut} size="small">
                <AnimatedLogout size={18} />
              </IconButton>
            </Tooltip>
          ) : (
            <ListItemButton
              onClick={handleSignOut}
              sx={{
                borderRadius: 2,
                px: 1,
                py: 0.9,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <AnimatedLogout size={18} />
              </ListItemIcon>
              <ListItemText
                primary="Sign out"
                primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
              />
            </ListItemButton>
          )}
        </Box>

        {/* User */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 1,
            px: collapsed ? 0 : 1,
            py: 0.5,
          }}
        >
          {collapsed ? (
            <Tooltip title={userName} placement="right" arrow>
              <Box>
                <Avatar name={userName} src={userAvatarSrc} size={40} />
              </Box>
            </Tooltip>
          ) : (
            <>
              <Avatar name={userName} src={userAvatarSrc} size={40} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                  {userName}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      open
      sx={{
        display: "block",
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          position: "relative",
          width: drawerWidth,
          overflowX: "hidden",
          boxSizing: "border-box",
          transition: (t) =>
            t.transitions.create("width", {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.shorter,
            }),
        },
      }}
    >
      {content}
    </Drawer>
  );
};

SidebarNav.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.node,
      to: PropTypes.string.isRequired,
    })
  ).isRequired,
  collapsed: PropTypes.bool.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
  headerContentExpanded: PropTypes.node,
};

SidebarNav.defaultProps = {
  headerContentExpanded: null,
};

export default SidebarNav;
