import axios from "axios";

// ── Base URL ───────────────────────────────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/`
  : "https://api.headzupp.com/api/";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
});

// ── Simple memory cache ────────────────────────────────────────────────────────
// Caches GET responses for a short TTL so navigating back feels instant.
const _cache = new Map();
const CACHE_TTL = {
  "services/":          60_000,   // 1 min — services rarely change
  "barbers/":           30_000,   // 30s
  "barber/me/":         30_000,
  "dashboard/":         10_000,   // 10s — user info
  "barber/reviews/":    15_000,
  "barber/clients/":    15_000,
  "barber/reports/":    30_000,
  "newsletter/manage/": 20_000,
};

function getCacheKey(url, params) {
  const p = params ? "?" + new URLSearchParams(params).toString() : "";
  return url + p;
}

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { _cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data, ttl) {
  _cache.set(key, { data, ts: Date.now(), ttl });
}

// Public invalidation — call this after mutations
API.invalidate = (...patterns) => {
  for (const key of _cache.keys()) {
    if (!patterns.length || patterns.some(p => key.includes(p))) {
      _cache.delete(key);
    }
  }
};

// ── Attach access token ────────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Cache interceptor for GET requests ────────────────────────────────────────
const _originalGet = API.get.bind(API);
API.get = async (url, config = {}) => {
  const { _noCache, params, ...rest } = config;

  if (!_noCache) {
    const cacheKey = getCacheKey(url, params);
    const ttl = Object.entries(CACHE_TTL).find(([k]) => url.includes(k))?.[1];

    if (ttl) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
      const res = await _originalGet(url, { params, ...rest });
      setCached(cacheKey, res, ttl);
      return res;
    }
  }

  return _originalGet(url, { params, ...rest });
};

// Invalidate cache on mutations
const _originalPost   = API.post.bind(API);
const _originalPatch  = API.patch.bind(API);
const _originalDelete = API.delete.bind(API);

API.post = async (url, ...args) => {
  const res = await _originalPost(url, ...args);
  // Invalidate related cache after mutations
  if (url.includes("appointments"))   API.invalidate("appointments", "schedule", "dashboard");
  if (url.includes("walk-in"))        API.invalidate("schedule", "dashboard");
  if (url.includes("availability"))   API.invalidate("availability");
  if (url.includes("time-off"))       API.invalidate("time-off");
  if (url.includes("newsletter"))     API.invalidate("newsletter");
  if (url.includes("review"))         API.invalidate("reviews");
  if (url.includes("reschedule"))     API.invalidate("reschedules");
  if (url.includes("barber/me"))      API.invalidate("barber/me");
  return res;
};
API.patch = async (url, ...args) => {
  const res = await _originalPatch(url, ...args);
  API.invalidate("appointments", "schedule", "dashboard", "clients", "reviews");
  return res;
};
API.delete = async (url, ...args) => {
  const res = await _originalDelete(url, ...args);
  API.invalidate("appointments", "schedule", "newsletter", "time-off", "clients");
  return res;
};

// ── Public endpoints — skip refresh logic ─────────────────────────────────────
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
