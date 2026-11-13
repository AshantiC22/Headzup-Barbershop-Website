import axios from "axios";
import { API_ROOT } from "./config";

const BASE_URL = `${API_ROOT}/api/`;

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
});

// GET responses for these paths are kept in memory briefly, so moving between
// tabs and pages doesn't refetch what was just loaded.
const _cache = new Map();
const CACHE_TTL = {
  "services/":          60_000,
  "barbers/":           30_000,
  "barber/me/":         30_000,
  "dashboard/":         10_000,
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

// Drop cached entries whose key contains any of the patterns (all if none).
API.invalidate = (...patterns) => {
  for (const key of _cache.keys()) {
    if (!patterns.length || patterns.some(p => key.includes(p))) {
      _cache.delete(key);
    }
  }
};

API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

// Writes invalidate whatever they could have changed.
const _originalPost   = API.post.bind(API);
const _originalPatch  = API.patch.bind(API);
const _originalDelete = API.delete.bind(API);

API.post = async (url, ...args) => {
  const res = await _originalPost(url, ...args);
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

// Endpoints that never need a token, so a 401 there isn't a reason to refresh.
const PUBLIC_URLS = [
  "token/", "token/refresh/", "register/", "barber/register/",
  "check-username/",
  "barbers/", "services/", "available-slots/",
  "push/subscribe/", "push/vapid-key/",
];
const isPublic = (url = "") => PUBLIC_URLS.some((p) => url.includes(p));

// On a 401, refresh the access token once and replay the request.
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
