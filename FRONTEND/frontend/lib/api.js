import axios from "axios";

// ── Base URL — uses env var on production, localhost in dev ───────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/`
  : "http://127.0.0.1:8000/api/";

const API = axios.create({ baseURL: BASE_URL });

// ── Attach access token to every request ─────────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Public endpoints — never trigger a token refresh ─────────────────────────
const PUBLIC_URLS = [
  "token/",
  "token/refresh/",
  "register/",
  "barber/register/",
  "check-username/",
  "password-reset/",
  "password-reset/confirm/",
];
const isPublic = (url = "") => PUBLIC_URLS.some((pub) => url.includes(pub));

// ── Auto-refresh on 401, redirect to login if refresh fails ──────────────────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublic(originalRequest.url)
    ) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        localStorage.removeItem("access");
        window.location.href = "/login?expired=true";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        // If the server rotated the refresh token, save it too
        if (res.data.refresh) {
          localStorage.setItem("refresh", res.data.refresh);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return API(originalRequest);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login?expired=true";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default API;
