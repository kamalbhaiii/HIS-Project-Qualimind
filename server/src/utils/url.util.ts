// src/utils/url.util.ts
import cfg from "@config/index";
const APP_BASE_URL = cfg.frontend.url;

/**
 * You’ll plug in your real token here (e.g. JWT, DB token, etc.).
 */
export function buildEmailVerificationUrl(token: string) {
  return `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
}
