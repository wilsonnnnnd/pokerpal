import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';

type Language = string;

export interface AppSettings {
    language: string;
    timezone?: string;
    currency?: string;
    // allow future fields
    [k: string]: any;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (l: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
};

const getDefaults = (): AppSettings => {
    let tz = 'UTC';
    try {
        const maybe = (Intl as any)?.DateTimeFormat?.().resolvedOptions?.()?.timeZone;
        if (maybe) tz = maybe;
    } catch (e) {
        // ignore
    }
    return { language: 'en', timezone: tz, currency: 'USD' };
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        (async () => {
            try {
                const raw = await getLocal<any>(SETTINGS_KEY);
                const defaults = getDefaults();

                // migrate/normalize stored value into AppSettings shape
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
                    settings = { language: l, timezone: tz, currency };
                    // if stored object lacked keys, ensure we persist full shape
                    if (!raw.language || !raw.timezone || !raw.currency) {
                        await setLocal(SETTINGS_KEY, settings).catch(() => {});
                    }
                }

                setLanguageState(settings.language);
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
            };
            await setLocal(SETTINGS_KEY, merged).catch(() => {});
            try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
        } catch (e) {
            // ignore persistence errors
        }
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageProvider;
