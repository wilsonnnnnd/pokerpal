// Rate limit configuration
// Values can be overridden via Expo public env variables:
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

export const RATE_LIMIT_WINDOW_MS = parseEnvInt('EXPO_PUBLIC_RATE_LIMIT_WINDOW_MS', DEFAULT_RATE_LIMIT_WINDOW_MS);
export const RATE_LIMIT_MAX_REQUESTS = parseEnvInt('EXPO_PUBLIC_RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS);

export default { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS };
