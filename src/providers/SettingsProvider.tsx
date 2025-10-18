import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';
import { getDeviceTimezone } from '@/utils/timezoneUtils';
import { getExchangeRate } from '@/services/exchangeService';

type Language = string;

export interface AppSettings {
    language: string;
    timezone?: string;
    currency?: string;
    // latestExchange 存储最近一条汇率记录（对象形式）
    latestExchange?: {
        from: string;
        to: string;
        rate: number;
        updated?: string;
        source?: string;
    };
    [k: string]: any;
}

interface SettingsContextType {
    language: Language;
    setLanguage: (l: Language) => Promise<void>;
    timezone: string;
    setTimezone: (t: string) => Promise<void>;
    currency: string;
    setCurrency: (c: string) => Promise<void>;
    formatCurrency: (v: number, code?: string) => string;
    latestExchange?: { from: string; to: string; rate: number; updated?: string | null; source?: string } | null;
    setExchangeRate: (currency: string, rate: number) => Promise<void>;
    // 提供 TTL 检查帮助，供消费方决定是否刷新
    isExchangeRatesFresh: () => boolean;
    convertToRMB: (amount: number, fromCurrency: string) => number;
    formatAsRMB: (amount: number, fromCurrency: string) => string;
    // 新增汇率管理功能
    updateExchangeRates: () => Promise<void>;
    getLastRateUpdate: () => Promise<string | null>;
    isUpdatingRates: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
    return ctx;
};

const getDefaults = (): AppSettings => {
    // 使用设备时区
    let tz = getDeviceTimezone();

    // 默认汇率配置 - 最新单条汇率记录
    const defaultLatestExchange = { from: 'AUD', to: 'CNY', rate: 4.7, updated: new Date().toISOString(), source: 'default' };

    return {
        language: 'zh',
        timezone: tz,
        currency: 'AUD',
        latestExchange: defaultLatestExchange,
    };
};

// 汇率 TTL：24 小时
const EXCHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('en');
    const [timezone, setTimezoneState] = useState<string>('GMT+10');
    const [currency, setCurrencyState] = useState<string>('AUD');
    // 内存中使用单一 latestExchange 对象作为单一数据源
    const [latestExchange, setLatestExchange] = useState<{ from: string; to: string; rate: number; updated?: string | null; source?: string } | null>(null);
    const [isUpdatingRates, setIsUpdatingRates] = useState<boolean>(false);

    // 派生的兼容性字段（为兼容旧接口）
    // 不再暴露旧的 exchangeRates map；直接使用 latestExchange

    useEffect(() => {
        (async () => {
            try {
                const raw = await getLocal<any>(SETTINGS_KEY);
                const defaults = getDefaults();

                let settings: AppSettings;
                if (!raw) {
                    settings = defaults;
                    await setLocal(SETTINGS_KEY, settings).catch(() => { });
                } else if (typeof raw === 'string') {
                    settings = { ...defaults, language: raw };
                    await setLocal(SETTINGS_KEY, settings).catch(() => { });
                } else {
                    const l = raw.language ?? defaults.language;
                    const tz = raw.timezone ?? defaults.timezone;
                    const currency = raw.currency ?? defaults.currency;
                    const latestExchange = raw.latestExchange ?? defaults.latestExchange;
                    settings = { language: l, timezone: tz, currency, latestExchange };
                    if (!raw.language || !raw.timezone || !raw.currency || !raw.latestExchange) {
                        await setLocal(SETTINGS_KEY, settings).catch(() => { });
                    }
                }

                setLanguageState(settings.language);
                setTimezoneState(settings.timezone ?? defaults.timezone ?? 'GMT+10');
                setCurrencyState(settings.currency ?? 'AUD');

                // 优先使用 settings.latestExchange 来设置内存中的 latestExchange（单一真相）
                try {
                    const latest = (settings as any).latestExchange ?? null;
                    if (latest && latest.from && latest.to && typeof latest.rate === 'number') {
                        const last = latest.updated ?? null;
                        // if has timestamp and fresh, use it
                        if (last) {
                            const elapsed = Date.now() - Date.parse(last);
                            if (!isNaN(elapsed) && elapsed < EXCHANGE_TTL_MS) {
                                setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: last, source: latest.source });
                            } else {
                                // stale: try to refresh from backend, but keep cached as fallback
                                try {
                                    const r = await getExchangeRate('AUD', 'CNY');
                                    const now = new Date().toISOString();
                                    setLatestExchange({ from: 'AUD', to: 'CNY', rate: r.rate, updated: now });
                                } catch (e) {
                                    setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: last, source: latest.source });
                                }
                            }
                        } else {
                            setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: null, source: latest.source });
                        }
                    } else {
                        const r = await getExchangeRate('AUD', 'CNY');
                        const now = new Date().toISOString();
                        setLatestExchange({ from: 'AUD', to: 'CNY', rate: r.rate, updated: now });
                    }
                } catch (e) {
                    // on any error while restoring exchange info, attempt to use latestExchange if present
                    try {
                        const le = (settings as any).latestExchange;
                        if (le && le.to && typeof le.rate === 'number') {
                            setLatestExchange({ from: le.from, to: le.to, rate: le.rate, updated: le.updated ?? null, source: le.source });
                        }
                    } catch (err) {
                        // ignore
                    }
                }

                try { (global as any).__pokerpal_settings = settings; } catch (e) { /* ignore */ }
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    const setLanguage = async (l: Language) => {
        setLanguageState(l);
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: l,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                latestExchange: existing?.latestExchange ?? defaults.latestExchange,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const setTimezone = async (t: string) => {
        setTimezoneState(t);
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: t,
                currency: existing?.currency ?? defaults.currency,
                latestExchange: existing?.latestExchange ?? defaults.latestExchange,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const setCurrency = async (c: string) => {
        setCurrencyState(c);
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: c ?? (existing?.currency ?? defaults.currency),
                latestExchange: existing?.latestExchange ?? defaults.latestExchange,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const setExchangeRate = async (currency: string, rate: number) => {
        // update latestExchange (single source of truth)
        const now = new Date().toISOString();
        setLatestExchange({ from: 'AUD', to: currency, rate, updated: now });
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const mergedLatest = { from: 'AUD', to: currency, rate, updated: now };
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                latestExchange: mergedLatest,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const convertToRMB = (amount: number, fromCurrency: string): number => {
        // Use single latestExchange as source of truth.
        // If converting from AUD, use latestExchange.rate (AUD -> latestExchange.to, typically CNY).
        const fromUpper = fromCurrency.toUpperCase();
        if (fromUpper === 'AUD') {
            const rate = latestExchange?.rate ?? 4.7;
            return amount * rate;
        } else if (fromUpper === 'CNY') {
            return amount;
        } else {
            // Without a full map we can't reliably convert other currencies.
            // Fall back to returning the original amount (previous code also returned original when missing).
            return amount;
        }
    };

    const formatAsRMB = (amount: number, fromCurrency: string): string => {
        const rmbAmount = convertToRMB(amount, fromCurrency);
        return `¥${rmbAmount.toFixed(2)}`;
    };

    // 汇率管理功能
    const updateExchangeRates = async (): Promise<void> => {
        try {
            setIsUpdatingRates(true);

            // 使用 backend 接口获取 AUD -> CNY
            const r = await getExchangeRate('AUD', 'CNY');
            const now = new Date().toISOString();
            // 更新 latestExchange
            setLatestExchange({ from: 'AUD', to: 'CNY', rate: r.rate, updated: now, source: r.source });

            // 保存 latestExchange 对象到本地存储
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const mergedLatest = { from: 'AUD', to: 'CNY', rate: r.rate, updated: now, source: r.source };
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                latestExchange: mergedLatest,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (error) {
            console.error('Failed to update exchange rates:', error);
            throw error;
        } finally {
            setIsUpdatingRates(false);
        }
    };

    const getLastRateUpdate = async (): Promise<string | null> => {
        try {
            // Try to query backend for updated timestamp
            const r = await getExchangeRate('AUD', 'CNY');
            return r.updated ?? null;
        } catch (e) {
            return null;
        }
    };


    const isExchangeRatesFresh = () => {
        const last = latestExchange?.updated ?? null;
        if (!last) return false;
        const elapsed = Date.now() - Date.parse(last);
        if (isNaN(elapsed)) return false;
        return elapsed < EXCHANGE_TTL_MS;
    };

    const formatCurrency = (v: number, code?: string) => {
        if (!Number.isFinite(v)) return '-';
        const currencyCode = code ?? currency ?? (global as any).__pokerpal_settings?.currency ?? 'AUD';
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(v);
        } catch (e) {
            const symbolMap: Record<string, string> = { AUD: '$', CNY: '¥' };
            const sym = symbolMap[currencyCode] ?? currencyCode + ' ';
            return `${sym}${v.toFixed(2)}`;
        }
    };

    return (
        <SettingsContext.Provider value={{
            language,
            setLanguage,
            timezone,
            setTimezone,
            currency,
            setCurrency,
            formatCurrency,
            latestExchange,
            isExchangeRatesFresh,
            setExchangeRate,
            convertToRMB,
            formatAsRMB,
            updateExchangeRates,
            getLastRateUpdate,
            isUpdatingRates
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
