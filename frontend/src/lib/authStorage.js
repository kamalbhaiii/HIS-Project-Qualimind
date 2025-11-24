const STORAGE_KEY = 'qm_auth';

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function saveAuth({ token, user }) {
  if (!token) return;
  const payload = { token, user };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getAuth() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw);
  if (!parsed || !parsed.token) return { token: null, user: null };
  return parsed;
}

export function getToken() {
  const { token } = getAuth();
  return token || null;
}

export function getUser() {
  const { user } = getAuth();
  return user || null;
}

export function clearAuth() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}
