import { auth as firebaseAuth } from '@/firebase/config';
import { API_BASE } from '@/constants/Url';

const DEFAULT_TIMEOUT = 15000;

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

export async function apiGet<T = any>(url: string, options?: { params?: Record<string, any>; headers?: Record<string, string>; timeout?: number }) {
  try {
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
    let headers = await attachAuthHeader({ 'Content-Type': 'application/json', ...(options?.headers ?? {}) });
    const finalUrl = url.includes('://') ? url : `${API_BASE.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    console.log('apiPost to', finalUrl, 'with body', body);
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
