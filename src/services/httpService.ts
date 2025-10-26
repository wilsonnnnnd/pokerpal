import { auth as firebaseAuth } from '@/firebase/config';
import { getFreshIdToken, tokenWillExpireWithin } from './authToken';
import { API_BASE } from '@/constants/Url';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '@/constants/rateLimit';

const DEFAULT_TIMEOUT = 15000;

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
    // If token is near expiry, force refresh before attaching
    try {
      const willExpire = tokenWillExpireWithin(300); // 5 minutes
      if (willExpire) {
        await getFreshIdToken({ force: true });
      }
    } catch (e) {
      // ignore
    }
    const token = await getFreshIdToken();
    if (token) return { ...headers, Authorization: `Bearer ${token}` };
    return headers;
  } catch (e) {
    return headers;
  }
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
  options?: { params?: Record<string, any>; headers?: Record<string, string>; timeout?: number; disableRateLimit?: boolean; autoRetryOn401?: boolean }
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
    // If 401, optionally force-refresh token and retry once
    if (res.status === 401) {
      if (options?.autoRetryOn401 !== false) {
        try {
          await getFreshIdToken({ force: true });
          headers = await attachAuthHeader(options?.headers ?? {});
          res = await fetchWithTimeout(finalUrl, { method: 'GET', headers }, options?.timeout ?? DEFAULT_TIMEOUT);
        } catch (e) {
          // ignore and fallthrough to error handling
        }
      }
      if (res.status === 401) {
        return Promise.reject({ status: 401, data: await (async () => {
          const text = await res.text();
          try { return JSON.parse(text || '{}'); } catch { return text; }
        })() });
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

export async function apiPost<T = any>(url: string, body?: any, options?: { headers?: Record<string, string>; timeout?: number; autoRetryOn401?: boolean }) {
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
    // If 401, optionally force-refresh token and retry once
    if (res.status === 401) {
      if ((options as any)?.autoRetryOn401 !== false) {
        try {
          await getFreshIdToken({ force: true });
          headers = await attachAuthHeader({ 'Content-Type': 'application/json', ...(options?.headers ?? {}) });
          res = await fetchWithTimeout(finalUrl, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined }, options?.timeout ?? DEFAULT_TIMEOUT);
        } catch (e) {
          // ignore and fallthrough
        }
      }
      if (res.status === 401) {
        return Promise.reject({ status: 401, data: await (async () => {
          const text = await res.text();
          try { return JSON.parse(text || '{}'); } catch { return text; }
        })() });
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
