import { auth as firebaseAuth } from '@/firebase/config';
import { API_BASE } from '@/constants/Url';

const DEFAULT_TIMEOUT = 15000;

// Simple in-memory sliding-window rate limiter.
// Protects the app from making too many backend requests in a short period.
// This is intentionally simple: it counts requests started within WINDOW_MS and
// rejects new requests when the count exceeds MAX_REQUESTS.
// Note: this limiter is process-global (per JS runtime) and will reset when the
// app reloads. It's not persisted across restarts.
// These values can be overridden via Expo public env variables:
//  - EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS (milliseconds)
//  - EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS (integer)
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10000; // 10s window by default
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 8; // max requests allowed in the window

function parseEnvInt(name: string, def: number) {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      const v = parseInt(process.env[name] as string, 10);
      if (!Number.isNaN(v) && Number.isFinite(v)) return v;
    }
  } catch (e) {
    // ignore parse errors
  }
  return def;
}

const RATE_LIMIT_WINDOW_MS = parseEnvInt('EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS);
const RATE_LIMIT_MAX_REQUESTS = parseEnvInt('EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS);

let rateLimitTimestamps: number[] = [];

function nowMs() {
  return Date.now();
}

function pruneOldTimestamps(windowMs = RATE_LIMIT_WINDOW_MS) {
  const cutoff = nowMs() - windowMs;
  rateLimitTimestamps = rateLimitTimestamps.filter((t) => t >= cutoff);
}

function allowRequest(windowMs = RATE_LIMIT_WINDOW_MS, maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  pruneOldTimestamps(windowMs);
  if (rateLimitTimestamps.length >= maxRequests) return false;
  rateLimitTimestamps.push(nowMs());
  return true;
}

async function attachAuthHeader(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  try {
    const auth = (firebaseAuth as any) ?? null;
    const user = auth?.currentUser ?? null;
    if (!user) return headers;
    try {
      const token = await user.getIdToken();
      if (token) {
        return { ...headers, Authorization: `Bearer ${token}` };
      }
    } catch (e) {
      // ignore token attach errors; return original headers
      return headers;
    }
  } catch (e) {
    return headers;
  }
  return headers;
}

function buildUrlWithParams(url: string, params?: Record<string, string | number | boolean>) {
  // support relative URLs by resolving against API_BASE when needed
  const base = url.includes('://') ? '' : API_BASE;
  const full = base ? `${API_BASE.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;
  if (!params) return full;
  const u = new URL(full);
  Object.entries(params).forEach(([k, v]) => u.searchParams.append(k, String(v)));
  return u.toString();
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timer as any);
    return res;
  } catch (err) {
    clearTimeout(timer as any);
    throw err;
  }
}

export async function apiGet<T = any>(
  url: string,
  options?: { params?: Record<string, any>; headers?: Record<string, string>; timeout?: number; disableRateLimit?: boolean }
) {
  try {
    // Rate limiting: allow callers to opt-out via options.disableRateLimit
    if (!options?.disableRateLimit) {
      const ok = allowRequest();
      if (!ok) {
        throw { status: 429, data: { message: 'Rate limit exceeded' } };
      }
    }
    const finalUrl = options?.params ? buildUrlWithParams(url, options.params) : (url.includes('://') ? url : `${API_BASE.replace(/\/$/, '')}/${url.replace(/^\//, '')}`);
    let headers = await attachAuthHeader(options?.headers ?? {});
    let res = await fetchWithTimeout(finalUrl, { method: 'GET', headers }, options?.timeout ?? DEFAULT_TIMEOUT);
    // If 401, try to refresh token and retry once
    if (res.status === 401) {
      try {
        // force refresh token
        const auth = (firebaseAuth as any) ?? null;
        const user = auth?.currentUser ?? null;
        if (user) {
          try { await user.getIdToken(true); } catch (_) { /* ignore */ }
          headers = await attachAuthHeader(options?.headers ?? {});
          res = await fetchWithTimeout(finalUrl, { method: 'GET', headers }, options?.timeout ?? DEFAULT_TIMEOUT);
        }
      } catch (e) {
        // ignore retry errors
      }
    }

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? JSON.parse(text || '{}') : text;
    if (!res.ok) {
      throw { status: res.status, data };
    }
    return data as T;
  } catch (err) {
    throw err;
  }
}

export async function apiPost<T = any>(url: string, body?: any, options?: { headers?: Record<string, string>; timeout?: number }) {
  try {
    // For POST, allow callers to disable the rate limiter via options.disableRateLimit
    const opt = options as any;
    if (!opt?.disableRateLimit) {
      const ok = allowRequest();
      if (!ok) {
        throw { status: 429, data: { message: 'Rate limit exceeded' } };
      }
    }

    let headers = await attachAuthHeader({ 'Content-Type': 'application/json', ...(options?.headers ?? {}) });
    const finalUrl = url.includes('://') ? url : `${API_BASE.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    let res = await fetchWithTimeout(finalUrl, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined }, options?.timeout ?? DEFAULT_TIMEOUT);
    // If 401, try refresh and retry once
    if (res.status === 401) {
      try {
        const auth = (firebaseAuth as any) ?? null;
        const user = auth?.currentUser ?? null;
        if (user) {
          try { await user.getIdToken(true); } catch (_) { /* ignore */ }
          headers = await attachAuthHeader({ 'Content-Type': 'application/json', ...(options?.headers ?? {}) });
          res = await fetchWithTimeout(finalUrl, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined }, options?.timeout ?? DEFAULT_TIMEOUT);
        }
      } catch (e) {
        // ignore
      }
    }

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? JSON.parse(text || '{}') : text;
    if (!res.ok) {
      throw { status: res.status, data };
    }
    return data as T;
  } catch (err) {
    throw err;
  }
}

const httpService = { apiGet, apiPost };
export default httpService;
