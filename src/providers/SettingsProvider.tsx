import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';
import { getDeviceTimezone } from '@/utils/timezoneUtils';
import { fetchCNYRates, getCurrencyToCNYRate, clearExchangeRateCache, getLastUpdateTime, getCurrentCachedRates } from '@/utils/exchangeRateUtils';

type Language = string;

export interface AppSettings {
    language: string;
    timezone?: string;
    currency?: string;
    exchangeRates?: Record<string, number>;
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
    exchangeRates: Record<string, number>;
    setExchangeRate: (currency: string, rate: number) => Promise<void>;
    convertToRMB: (amount: number, fromCurrency: string) => number;
    formatAsRMB: (amount: number, fromCurrency: string) => string;
    // 新增汇率管理功能
    updateExchangeRates: () => Promise<void>;
    getLastRateUpdate: () => Promise<string | null>;
    clearRateCache: () => Promise<void>;
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
    
    // 默认汇率配置 - AUD 对 CNY 的合理默认值
    const defaultExchangeRates = {
        CNY: 4.7,   // 1 AUD = 4.7 CNY (接近实际汇率的默认值)
    };
    
    return { 
        language: 'zh', 
        timezone: tz, 
        currency: 'AUD',
        exchangeRates: defaultExchangeRates
    };
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('en');
    const [timezone, setTimezoneState] = useState<string>('GMT+10');
    const [currency, setCurrencyState] = useState<string>('AUD');
    const [exchangeRates, setExchangeRatesState] = useState<Record<string, number>>({});
    const [isUpdatingRates, setIsUpdatingRates] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            try {
                const raw = await getLocal<any>(SETTINGS_KEY);
                const defaults = getDefaults();

                let settings: AppSettings;
                if (!raw) {
                    settings = defaults;
                    await setLocal(SETTINGS_KEY, settings).catch(() => {});
                } else if (typeof raw === 'string') {
                    settings = { ...defaults, language: raw };
                    await setLocal(SETTINGS_KEY, settings).catch(() => {});
                } else {
                    const l = raw.language ?? defaults.language;
                    const tz = raw.timezone ?? defaults.timezone;
                    const currency = raw.currency ?? defaults.currency;
                    const exchangeRates = raw.exchangeRates ?? defaults.exchangeRates;
                    settings = { language: l, timezone: tz, currency, exchangeRates };
                    if (!raw.language || !raw.timezone || !raw.currency || !raw.exchangeRates) {
                        await setLocal(SETTINGS_KEY, settings).catch(() => {});
                    }
                }

                setLanguageState(settings.language);
                setTimezoneState(settings.timezone ?? defaults.timezone ?? 'GMT+10');
                setCurrencyState(settings.currency ?? 'AUD');
                
                // 优先使用缓存的汇率数据
                try {
                    const cachedRates = await getCurrentCachedRates();
                    setExchangeRatesState(cachedRates);
                } catch (e) {
                    setExchangeRatesState(settings.exchangeRates ?? defaults.exchangeRates!);
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
                exchangeRates: existing?.exchangeRates ?? defaults.exchangeRates!,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
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
                exchangeRates: existing?.exchangeRates ?? defaults.exchangeRates!,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
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
                exchangeRates: existing?.exchangeRates ?? defaults.exchangeRates!,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const setExchangeRate = async (currency: string, rate: number) => {
        const newRates = { ...exchangeRates, [currency]: rate };
        setExchangeRatesState(newRates);
        try {
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                exchangeRates: newRates,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore
        }
    };

    const convertToRMB = (amount: number, fromCurrency: string): number => {
        // exchangeRates 存储的是以 AUD 为基础的汇率
        // 例如: {CNY: 4.7} 表示 1 AUD = 4.7 CNY
        
        if (fromCurrency.toUpperCase() === 'AUD') {
            // 从 AUD 转换到 CNY
            const rate = exchangeRates.CNY ?? 4.7;
            return amount * rate;
        } else if (fromCurrency.toUpperCase() === 'CNY') {
            // CNY 本身，直接返回
            return amount;
        } else {
            // 其他货币通过 AUD 中转到 CNY
            // 首先从其他货币转换到 AUD (除以该货币对AUD的汇率)
            // 然后从 AUD 转换到 CNY (乘以AUD对CNY的汇率)
            const fromCurrencyToAUDRate = exchangeRates[fromCurrency.toUpperCase()];
            const audToCNYRate = exchangeRates.CNY ?? 4.7;
            
            if (fromCurrencyToAUDRate) {
                // 假设 exchangeRates[USD] = 0.67 表示 1 AUD = 0.67 USD
                // 那么 1 USD = 1/0.67 AUD
                const audAmount = amount / fromCurrencyToAUDRate;
                return audAmount * audToCNYRate;
            } else {
                // 如果没有汇率数据，返回原值
                return amount;
            }
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
            
            // 获取最新汇率 (以AUD为基础，获取CNY等汇率)
            const latestRates = await fetchCNYRates();
            
            // 更新状态
            setExchangeRatesState(latestRates);
            
            // 保存到本地存储
            const existing = await getLocal<Partial<AppSettings> | null>(SETTINGS_KEY);
            const defaults = getDefaults();
            const merged: AppSettings = {
                language: existing?.language ?? defaults.language,
                timezone: existing?.timezone ?? defaults.timezone,
                currency: existing?.currency ?? defaults.currency,
                exchangeRates: latestRates,
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (error) {
            console.error('Failed to update exchange rates:', error);
            throw error;
        } finally {
            setIsUpdatingRates(false);
        }
    };

    const getLastRateUpdate = async (): Promise<string | null> => {
        return await getLastUpdateTime('AUD');
    };

    const clearRateCache = async (): Promise<void> => {
        await clearExchangeRateCache();
    };

    const formatCurrency = (v: number, code?: string) => {
        if (!Number.isFinite(v)) return '-';
        const currencyCode = code ?? currency ?? (global as any).__pokerpal_settings?.currency ?? 'AUD';
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(v);
        } catch (e) {
            const symbolMap: Record<string, string> = { AUD: '$', CNY: '¥'};
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
            exchangeRates,
            setExchangeRate,
            convertToRMB,
            formatAsRMB,
            updateExchangeRates,
            getLastRateUpdate,
            clearRateCache,
            isUpdatingRates
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
