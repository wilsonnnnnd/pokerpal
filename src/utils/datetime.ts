export const getDeviceTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone; // 例如 "Australia/Sydney"
    } catch {
        return undefined;
    }
};

export const formatLocal = (
    ms: number,
    opts: Intl.DateTimeFormatOptions = {}
) => {
    // undefined 让系统自动用设备语言/地区；hour12 你自己决定是否 12 小时制
    return new Date(ms).toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: getDeviceTimeZone(), // ★ 关键：用设备时区
        ...opts,
    });
};

// 常用分拆
export const formatLocalDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: getDeviceTimeZone(),
    });

export const formatLocalTime = (ms: number) =>
    new Date(ms).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: getDeviceTimeZone(),
    });
