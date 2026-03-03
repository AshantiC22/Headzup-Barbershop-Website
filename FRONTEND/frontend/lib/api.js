import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/`
  : "http://127.0.0.1:8000/api/";

const API = axios.create({
  baseURL: BASE_URL,
});

// ── Attach access token to every request ─────────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Public endpoints that should never trigger a token refresh ────────────────
const PUBLIC_URLS = [
  "token/",
  "token/refresh/",
  "register/",
  "check-username/",
  "password-reset/",
  "password-reset/confirm/",
];

const isPublic = (url = "") => PUBLIC_URLS.some((pub) => url.includes(pub));

// ── Auto-refresh access token on 401, redirect to login if refresh fails ──────
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry public endpoints — they 401 for a real reason (bad creds etc)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublic(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        // No refresh token at all — send to login
        localStorage.removeItem("access");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return API(originalRequest);
      } catch {
        // Refresh token expired or invalid — clear everything and redirect
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
