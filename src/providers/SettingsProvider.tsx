import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';
// timezone support removed
import { getExchangeRate } from '@/services/exchangeService';
import { setSimpleTLocale } from '@/i18n/simpleT';
import { DEFAULT_FROM_CURRENCY, DEFAULT_TO_CURRENCY, DEFAULT_EXCHANGE_RATE, DEFAULT_EXCHANGE_SOURCE, DEFAULT_UI_LANGUAGE, DEFAULT_CURRENCY } from '@/constants/appConfig';

type Language = string;

export interface AppSettings {
    language: string;
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
    isUpdatingRates: boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
    return ctx;
};

const getDefaults = (): AppSettings => {
    // 默认汇率配置 - 最新单条汇率记录
    const defaultLatestExchange = { from: DEFAULT_FROM_CURRENCY, to: DEFAULT_TO_CURRENCY, rate: DEFAULT_EXCHANGE_RATE, updated: new Date().toISOString(), source: DEFAULT_EXCHANGE_SOURCE };

    return {
        language: DEFAULT_UI_LANGUAGE,
        currency: DEFAULT_FROM_CURRENCY,
        latestExchange: defaultLatestExchange,
    };
};

// 汇率 TTL：24 小时
const EXCHANGE_TTL_MS = 24 * 60 * 60 * 1000;

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>(DEFAULT_UI_LANGUAGE);
    // timezone removed
    const [currency, setCurrencyState] = useState<string>(DEFAULT_FROM_CURRENCY);
    // 内存中使用单一 latestExchange 对象作为单一数据源
    const [latestExchange, setLatestExchange] = useState<{ from: string; to: string; rate: number; updated?: string | null; source?: string } | null>(null);
    const [isUpdatingRates, setIsUpdatingRates] = useState<boolean>(false);

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
                        const currency = raw.currency ?? defaults.currency;
                        const latestExchange = raw.latestExchange ?? defaults.latestExchange;
                        settings = { language: l, currency, latestExchange };
                        if (!raw.language || !raw.currency || !raw.latestExchange) {
                            await setLocal(SETTINGS_KEY, settings).catch(() => { });
                        }
                }

                setLanguageState(settings.language);
                // sync simpleT default locale with provider's language
                try { setSimpleTLocale(settings.language); } catch (e) { /* ignore */ }
                // 已移除时区，仅设置语言和货币
                const initialFromCurrency = settings.currency ?? DEFAULT_FROM_CURRENCY;
                setCurrencyState(initialFromCurrency);

                // 优先使用 settings.latestExchange 来设置内存中的 latestExchange（单一真相）
                try {
                    const latest = (settings as any).latestExchange ?? null;
                    if (latest && latest.from && latest.to && typeof latest.rate === 'number') {
                        const last = latest.updated ?? null;
                        // 若有时间戳且未过期则使用
                        if (last) {
                            const elapsed = Date.now() - Date.parse(last);
                            if (!isNaN(elapsed) && elapsed < EXCHANGE_TTL_MS) {
                                setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: last, source: latest.source });
                            } else {
                                // 数据过期：尝试从后端刷新，失败则回退使用缓存
                try {
                    const r = await getExchangeRate(initialFromCurrency, DEFAULT_TO_CURRENCY);
                    const now = new Date().toISOString();
                    setLatestExchange({ from: initialFromCurrency, to: DEFAULT_TO_CURRENCY, rate: r.rate, updated: now });
                } catch (e) {
                                    setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: last, source: latest.source });
                                }
                            }
                        } else {
                            setLatestExchange({ from: latest.from, to: latest.to, rate: latest.rate, updated: null, source: latest.source });
                        }
                    } else {
                            const r = await getExchangeRate(initialFromCurrency, DEFAULT_TO_CURRENCY);
                            const now = new Date().toISOString();
                            setLatestExchange({ from: initialFromCurrency, to: DEFAULT_TO_CURRENCY, rate: r.rate, updated: now });
                    }
                } catch (e) {
                    // 恢复汇率信息时出错，尝试使用 settings.latestExchange
                    try {
                        const le = (settings as any).latestExchange;
                        if (le && le.to && typeof le.rate === 'number') {
                            setLatestExchange({ from: le.from, to: le.to, rate: le.rate, updated: le.updated ?? null, source: le.source });
                        }
                    } catch (err) {
                        // 忽略错误
                    }
                }

                try { (global as any).__pokerpal_settings = settings; } catch (e) { /* ignore */ }
            } catch (e) {
                // 忽略错误
            }
        })();
    }, []);

    const setLanguage = async (l: Language) => {
        setLanguageState(l);
        try { setSimpleTLocale(l); } catch (e) { /* ignore */ }
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
            // 忽略错误
        }
    };

    // 已移除时区相关 API

    const setCurrency = async (c: string) => {
        setCurrencyState(c);
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                currency: c ?? (existing?.currency ?? defaults.currency),
                latestExchange: existing?.latestExchange ?? defaults.latestExchange,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // 忽略错误
        }
    };

    const setExchangeRate = async (toCurrency: string, rate: number) => {
    // 更新 latestExchange（单一真相）
        const now = new Date().toISOString();
        const baseFrom = currency ?? DEFAULT_FROM_CURRENCY;
        setLatestExchange({ from: baseFrom, to: toCurrency, rate, updated: now });
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const mergedLatest = { from: baseFrom, to: toCurrency, rate, updated: now };
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                latestExchange: mergedLatest,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => { });
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
            } catch (e) {
            // 忽略错误
        }
    };

    const convertToRMB = (amount: number, fromCurrency: string): number => {
    // 使用 latestExchange 作为单一数据源。
    // 若来源为默认货币，则使用 latestExchange.rate（通常转换为 CNY）。
        const fromUpper = fromCurrency.toUpperCase();
        if (fromUpper === DEFAULT_FROM_CURRENCY) {
            const rate = latestExchange?.rate ?? 4.7;
            return amount * rate;
        } else if (fromUpper === DEFAULT_TO_CURRENCY) {
            return amount;
        } else {
            // 没有完整映射时无法可靠转换其他货币。
            // 回退为返回原值（与之前逻辑一致）。
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

            // 首先检查本地 SETTINGS_KEY 中是否有最新汇率且在 TTL 内
            try {
                const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
                const le = existing?.latestExchange as any | undefined;
                if (le && le.updated) {
                    const elapsed = Date.now() - Date.parse(le.updated);
                    if (!isNaN(elapsed) && elapsed < EXCHANGE_TTL_MS) {
                        // 本地数据仍然新鲜，直接使用并返回
                        setLatestExchange({ from: le.from ?? DEFAULT_FROM_CURRENCY, to: le.to ?? DEFAULT_TO_CURRENCY, rate: le.rate, updated: le.updated, source: le.source });
                        return;
                    }
                }
            } catch (e) {
                // 忽略本地读取错误，继续调用后端获取
            }

            // 本地没有新鲜数据，调用后端接口获取最新汇率
            const fromCurrency = currency ?? DEFAULT_FROM_CURRENCY;
            const r = await getExchangeRate(fromCurrency, DEFAULT_TO_CURRENCY);
            const now = new Date().toISOString();
            // 更新 latestExchange
            setLatestExchange({ from: fromCurrency, to: DEFAULT_TO_CURRENCY, rate: r.rate, updated: now, source: r.source });

            // 保存 latestExchange 对象到本地存储
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const mergedLatest = { from: currency ?? DEFAULT_FROM_CURRENCY, to: DEFAULT_TO_CURRENCY, rate: r.rate, updated: now, source: r.source };
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


    const isExchangeRatesFresh = () => {
        const last = latestExchange?.updated ?? null;
        if (!last) return false;
        const elapsed = Date.now() - Date.parse(last);
        if (isNaN(elapsed)) return false;
        return elapsed < EXCHANGE_TTL_MS;
    };

    const formatCurrency = (v: number, code?: string) => {
        if (!Number.isFinite(v)) return '-';
    const currencyCode = code ?? currency ?? (global as any).__pokerpal_settings?.currency ?? DEFAULT_CURRENCY;
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
            currency,
            setCurrency,
            formatCurrency,
            latestExchange,
            isExchangeRatesFresh,
            setExchangeRate,
            convertToRMB,
            formatAsRMB,
            updateExchangeRates,
            isUpdatingRates
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
