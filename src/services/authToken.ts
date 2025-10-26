import { auth as firebaseAuth } from '@/firebase/config';
import { atobSafe } from '@/utils/base64';

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getFreshIdToken(opts?: { force?: boolean }): Promise<string | null> {
  // If not forcing and we have a cached token, return it
  if (!opts?.force && cachedToken) return cachedToken;

  // If a request is already in-flight and caller didn't force, return the same promise
  if (!opts?.force && inflight) return inflight;

  const p = (async () => {
    try {
      const auth = (firebaseAuth as any) ?? null;
      const user = auth?.currentUser ?? null;
      if (!user) return null;
      const token = await user.getIdToken(!!opts?.force);
      cachedToken = token ?? null;
      return cachedToken;
    } catch (e) {
      return null;
    } finally {
      inflight = null;
    }
  })();

  inflight = p;
  return p;
}

export function clearCachedToken() {
  cachedToken = null;
}

function parseJwtPayload(token: string | null) {
  try {
    if (!token) return null;
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = atobSafe(b64);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the currently cached token will expire within `withinSeconds`.
 * If no cached token exists, returns true to indicate a refresh is needed.
 */
export function tokenWillExpireWithin(withinSeconds = 300): boolean {
  try {
    if (!cachedToken) return true;
    const payload = parseJwtPayload(cachedToken);
    if (!payload || !payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now <= withinSeconds;
  } catch (e) {
    return true;
  }
}

export default { getFreshIdToken, clearCachedToken };
