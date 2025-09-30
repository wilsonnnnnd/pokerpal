import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';

/**
 * 获取设备当前时区
 * @returns 时区字符串，例如 'Asia/Shanghai', 'America/New_York' 等
 */
export const getDeviceTimezone = (): string => {
    try {
        // 方法1: 使用 Intl.DateTimeFormat 获取时区
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone) {
            return timezone;
        }
    } catch (e) {
        console.warn('Failed to get timezone from Intl.DateTimeFormat:', e);
    }

    try {
        // 方法2: 使用 Date 对象计算时区偏移
        const now = new Date();
        const offsetMinutes = now.getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60; // 注意负号，因为 getTimezoneOffset 返回的是相反的值
        
        // 转换为 GMT+X 格式
        if (offsetHours >= 0) {
            return `GMT+${offsetHours}`;
        } else {
            return `GMT${offsetHours}`;
        }
    } catch (e) {
        console.warn('Failed to calculate timezone offset:', e);
    }

    // 默认返回 GMT+10
    return 'GMT+10';
};

/**
 * 获取时区的友好显示名称
 * @param timezone 时区字符串
 * @returns 友好的时区显示名称
 */
export const getTimezoneDisplayName = (timezone: string): string => {
    try {
        // 如果是标准时区名称，尝试获取本地化显示名称
        if (timezone.includes('/')) {
            const formatter = new Intl.DateTimeFormat('zh-CN', {
                timeZone: timezone,
                timeZoneName: 'long'
            });
            
            const parts = formatter.formatToParts(new Date());
            const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
            
            if (timeZoneName) {
                return `${timezone} (${timeZoneName})`;
            }
        }
    } catch (e) {
        console.warn('Failed to get timezone display name:', e);
    }

    return timezone;
};

/**
 * 获取常用时区列表
 * @returns 常用时区数组
 */
export const getCommonTimezones = (): Array<{ key: string; label: string }> => {
    const timezones = [
        'Asia/Shanghai',
        'Asia/Tokyo',
        'Asia/Seoul',
        'Asia/Hong_Kong',
        'Asia/Singapore',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Australia/Brisbane',
        'Europe/London',
        'Europe/Paris',
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
    ];

    return timezones.map(tz => ({
        key: tz,
        label: getTimezoneDisplayName(tz)
    }));
};

/**
 * 更新全局设置中的时区
 * @param newTimezone 新的时区字符串
 */
export const updateGlobalTimezone = async (newTimezone: string): Promise<void> => {
    try {
        // 1. 获取当前设置
        const currentSettings = await getLocal<any>(SETTINGS_KEY);
        
        // 2. 更新时区
        const updatedSettings = {
            ...currentSettings,
            timezone: newTimezone
        };

        // 3. 保存到 AsyncStorage
        await setLocal(SETTINGS_KEY, updatedSettings);

        // 4. 更新全局变量
        try {
            (global as any).__pokerpal_settings = updatedSettings;
        } catch (e) {
            console.warn('Failed to update global settings:', e);
        }

        console.log('Timezone updated to:', newTimezone);
    } catch (e) {
        console.error('Failed to update timezone:', e);
        throw e;
    }
};

/**
 * 自动检测并更新设备时区到全局设置
 * @returns 检测到的时区字符串
 */
export const autoDetectAndUpdateTimezone = async (): Promise<string> => {
    try {
        const deviceTimezone = getDeviceTimezone();
        await updateGlobalTimezone(deviceTimezone);
        return deviceTimezone;
    } catch (e) {
        console.error('Failed to auto-detect and update timezone:', e);
        throw e;
    }
};

/**
 * 手动设置时区
 * @param timezone 时区字符串
 */
export const setTimezone = async (timezone: string): Promise<void> => {
    await updateGlobalTimezone(timezone);
};
