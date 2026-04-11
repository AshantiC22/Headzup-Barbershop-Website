import axios from "axios";

// ── Base URL ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/`
  : "http://127.0.0.1:8000/api/";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,          // 12s — enough for Railway cold start, not forever
  headers: { "Content-Type": "application/json" },
});

// ── Attach access token ───────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Public endpoints — skip refresh logic ────────────────────────────────────
const PUBLIC_URLS = [
  "token/", "token/refresh/", "register/", "barber/register/",
  "check-username/", "password-reset/", "password-reset/confirm/",
  "barbers/", "services/", "available-slots/",
];
const isPublic = (url = "") => PUBLIC_URLS.some((p) => url.includes(p));

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const req = error.config;

    // Network timeout or no response — don't retry, surface the error fast
    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !req._retry && !isPublic(req.url)) {
      req._retry = true;
      if (typeof window === "undefined") return Promise.reject(error);
      const refresh = localStorage.getItem("refresh");

      if (!refresh) {
        localStorage.removeItem("access");
        window.location.href = "/login?expired=true";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh }, { timeout: 8000 });
        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);
        if (res.data.refresh) localStorage.setItem("refresh", res.data.refresh);
        req.headers.Authorization = `Bearer ${newAccess}`;
        return API(req);
      } catch {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login?expired=true";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
