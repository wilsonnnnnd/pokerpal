// Shared numeric input normalizer used across screens
export const normalizeNumberInput = (
    raw: string,
    opts?: { integers?: boolean; allowNegative?: boolean; allowDecimal?: boolean }
) => {
    const { integers = false, allowNegative = false, allowDecimal = false } = opts || {};
    if (!raw) return '';
    let s = raw.trim();

    if (integers) {
        // keep digits only, remove leading zeros via parseInt
        const digits = s.replace(/[^0-9]/g, '');
        if (!digits) return '';
        const n = parseInt(digits, 10);
        return String(n);
    }

    // allow decimals and optional leading negative
    // strip invalid chars first (keep digits, dot, minus)
    s = s.replace(/[^0-9.\-]/g, '');
    // if negative not allowed, remove minus
    if (!allowNegative) {
        s = s.replace(/-/g, '');
    } else {
        // keep only leading minus
        s = s.replace(/(?!^)-/g, '');
    }

    // collapse multiple dots to single (keep first dot)
    const parts = s.split('.');
    if (parts.length > 1) {
        s = parts.shift() + '.' + parts.join('');
    }

    // parse to float to normalize (removes leading zeros)
    const parsed = parseFloat(s);
    if (Number.isNaN(parsed)) {
        // if user typed just '-' or '.' keep it to allow typing, otherwise return empty
        if (s === '-' || s === '.' || s === '-.') return s;
        return '';
    }
    // If decimals not allowed, return integer part
    if (!allowDecimal) {
        return String(Math.trunc(parsed));
    }
    return String(parsed);
};

export default normalizeNumberInput;
