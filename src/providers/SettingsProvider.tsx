import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getLocal, setLocal } from '@/services/storageService';
import { SETTINGS_KEY } from '@/constants/namingVar';

type Language = string;

export interface AppSettings {
    language: string;
    timezone?: string;
    currency?: string;
    [k: string]: any;
}

interface SettingsContextType {
    language: Language;
    setLanguage: (l: Language) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
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

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('en');

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
                    settings = { language: l, timezone: tz, currency };
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
            // ignore
        }
    };

    return (
        <SettingsContext.Provider value={{ language, setLanguage }}>
            {children}
        </SettingsContext.Provider>
    );
};

export default SettingsProvider;
