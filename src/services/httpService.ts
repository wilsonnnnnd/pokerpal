import { auth as firebaseAuth } from '@/firebase/config';
import { getFreshIdToken, tokenWillExpireWithin } from './authToken';
import { API_BASE } from '@/constants/Url';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '@/constants/rateLimit';

const DEFAULT_TIMEOUT = 15000;

let rateLimitTimestamps: number[] = [];

function nowMs() {
  return Date.now();
}

function removeOldTimestamps(windowMs = RATE_LIMIT_WINDOW_MS) {
  const cutoff = nowMs() - windowMs;
  rateLimitTimestamps = rateLimitTimestamps.filter((t) => t >= cutoff);
}

function allowRequest(windowMs = RATE_LIMIT_WINDOW_MS, maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  removeOldTimestamps(windowMs);
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

async function fetchWithAuthRetry(input: string, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT, opts?: { autoRetryOn401?: boolean }) {
  let res = await fetchWithTimeout(input, init, timeout);
  if (res.status === 401) {
    if (opts?.autoRetryOn401 !== false) {
      try {
        await getFreshIdToken({ force: true });
        const headers = await attachAuthHeader((init.headers as Record<string, string>) ?? {});
        init = { ...init, headers };
        res = await fetchWithTimeout(input, init, timeout);
      } catch (e) {
        // ignore and fallthrough to error handling
      }
    }
    if (res.status === 401) {
      const text = await res.text();
      try {
        const data = JSON.parse(text || '{}');
        throw { status: 401, data };
      } catch {
        throw { status: 401, data: text };
      }
    }
  }
  return res;
}

export async function apiGet<T = any>(
  url: string,
  options?: { params?: Record<string, any>; headers?: Record<string, string>; timeout?: number; disableRateLimit?: boolean; autoRetryOn401?: boolean }
) {
  try {
    // Rate limit: enabled by default. Caller can set options.disableRateLimit to skip it.
    // If there are too many requests in the window, allowRequest() returns false and we throw 429.
    if (!options?.disableRateLimit) {
      const ok = allowRequest();
      if (!ok) {
        throw { status: 429, data: { message: 'Rate limit exceeded' } };
      }
    }

    // Build final URL
    const finalUrl = options?.params
      ? buildUrlWithParams(url, options.params)
      : (url.includes('://') ? url : `${API_BASE.replace(/\/$/, '')}/${url.replace(/^\//, '')}`);

    // Attach auth header: attachAuthHeader may refresh the token if it is near expiry.
    // It returns headers that include Authorization when a token is present.
    let headers = await attachAuthHeader(options?.headers ?? {});

    // Send request: fetchWithAuthRetry wraps timeout and 401 auto-retry logic.
    // On 401 it tries to refresh the token and retry once (this can be controlled by options).
    let res = await fetchWithAuthRetry(finalUrl, { method: 'GET', headers }, options?.timeout ?? DEFAULT_TIMEOUT, { autoRetryOn401: options?.autoRetryOn401 });

    // Read response and parse JSON when content-type contains application/json.
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? JSON.parse(text || '{}') : text;

    // If response status is not OK, throw { status, data } so caller can handle it.
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
    let res = await fetchWithAuthRetry(finalUrl, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined }, options?.timeout ?? DEFAULT_TIMEOUT, { autoRetryOn401: (options as any)?.autoRetryOn401 });

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
