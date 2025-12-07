// src/utils/url.util.ts
import cfg from "@config/index";
const APP_BASE_URL = cfg.frontend.url;

export function buildEmailVerificationUrl(token: string) {
  return `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetUrl(token: string) {
  return `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
}