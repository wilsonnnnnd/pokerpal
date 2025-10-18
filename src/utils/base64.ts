export function atobSafe(input: string): string {
  // prefer global atob if available (Expo / RN may polyfill)
  // @ts-ignore
  if (typeof global !== 'undefined' && (global as any).atob) {
    // @ts-ignore
    return (global as any).atob(input);
  }

  // Try Buffer (available in many JS runtimes / metro with polyfills)
  try {
    // @ts-ignore
    if (typeof Buffer !== 'undefined') {
      // @ts-ignore
      return Buffer.from(input, 'base64').toString('binary');
    }
  } catch (e) {
    // ignore
  }

  // Last-resort: attempt decode via atob poly that uses window atob if exists
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const b64 = require('base-64');
    return b64.decode(input);
  } catch (e) {
    return '';
  }
}
