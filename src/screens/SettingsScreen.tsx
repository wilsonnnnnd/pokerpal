import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getLocal, removeLocal, setLocal } from '@/services/storageService';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged, signOut } from '@/services/localAuth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { fetchUserProfile, UserProfile } from '@/firebase/getUserProfile';
import SelectField from '@/components/SelectField';
import { commonCurrencies, getCurrencySymbol } from '@/constants/currency';
import { InfoRow } from '@/components/InfoRow';
import MessagePopUp from '@/components/MessagePopUp';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';
import { useSettings } from '@/providers/SettingsProvider';
import { simpleT } from '@/i18n/simpleT';

type AppSettings = {
    language?: string;
};

// (use SelectField component for dropdowns)

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [persistedUser, setPersistedUser] = useState<any | null>(null);

    // Use global settings provider
    const { language, setLanguage, currency } = useSettings();
    // snapshot of saved language/currency to detect changes
    const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
    const [initialCurrency, setInitialCurrency] = useState<string | null>(null);
    const initialSetRef = React.useRef(false);
    const initialCurrencySetRef = React.useRef(false);

    // MessagePopUp state
    const [popup, setPopup] = useState<{
        visible: boolean;
        title: string;
        message: string;
        isWarning?: boolean;
        onConfirm?: () => void;
        onCancel?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
    });

    // load persisted settings
    useEffect(() => {
        (async () => {
            try {
                // language is loaded by LanguageProvider; just load persisted user for debug
                const pu = await getLocal(CURRENT_USER_KEY);
                setPersistedUser(pu);
            } catch (e) {
                console.warn('load settings', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // set initialLanguage & initialCurrency once when provider has loaded persisted values
    useEffect(() => {
        if (!initialSetRef.current && language) {
            setInitialLanguage(language);
            initialSetRef.current = true;
        }
        if (!initialCurrencySetRef.current && currency !== undefined) {
            setInitialCurrency(currency ?? null);
            initialCurrencySetRef.current = true;
        }
    }, [language, currency]);


    // subscribe user
    useEffect(() => {
        const unsub = onAuthStateChanged(async (u: any) => {
            if (!u) {
                setUser(null);
                setProfile(null);
                return;
            }
            setUser(u);
            try {
                const p = await fetchUserProfile(u.uid);
                setProfile(p ?? null);
            } catch (e) {
                setProfile(null);
            }
        });
        return () => unsub && unsub();
    }, []);

    const save = async () => {
        try {
            if (!language) throw new Error(simpleT('choose_language', language));
            // ensure provider persists
            await setLanguage(language);
            // currency is read-only here; persist existing currency value into SETTINGS_KEY
            try {
                const existing = await getLocal<any>(SETTINGS_KEY);
                const merged = { ...(existing || {}), language, currency: existing?.currency ?? (global as any).__pokerpal_settings?.currency ?? 'AUD' };
                await setLocal(SETTINGS_KEY, merged).catch(() => {});
                try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
            } catch (e) { /* ignore */ }
            setInitialLanguage(language);
            setInitialCurrency(currency ?? null);
            setPopup({
                visible: true,
                title: simpleT('save_success_title', language),
                message: simpleT('save_success_msg', language),
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } catch (e: any) {
            setPopup({
                visible: true,
                title: simpleT('save_fail_title', language),
                message: e?.message || String(e),
                isWarning: true,
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        }
    };

    const reset = async () => {
        setPopup({
            visible: true,
            title: simpleT('reset_title', language),
            message: simpleT('reset_confirm_msg', language),
            isWarning: true,
            onConfirm: async () => {
                const defaults = { language: 'en', timezone: 'GMT+10', currency: 'AUD' };
                try { await setLanguage(defaults.language); } catch (e) { /* ignore */ }
                try { await setLocal(SETTINGS_KEY, defaults); } catch (e) { /* ignore */ }
                setInitialLanguage(defaults.language);
                setInitialCurrency(defaults.currency);
                setPopup(prev => ({ ...prev, visible: false }));
            },
            onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
        });
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color.confirm} />
            <Text style={styles.loadingText}>{simpleT('loading_settings', language)}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('user_info', language)}</Text>
                    {user ? (
                        <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                            <Text style={{ fontWeight: '600', color: color.title }}>{profile?.nickname ?? user.displayName ?? simpleT('unnamed', language)}</Text>
                            <Text style={{ color: color.text, marginTop: 4 }}>{user.email ?? (user.isAnonymous ? simpleT('guest_account', language) : '')}</Text>
                            <Text style={{ color: color.text, marginTop: 4 }}>{simpleT('identity', language)}: {profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}</Text>
                            <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                                {/* Helper to attempt revoke/signout for Google, best-effort */}
                                <PrimaryButton
                                    title={simpleT('logout', language)}
                                    icon="logout"
                                    variant="outlined"
                                    onPress={async () => {
                                        // Soft sign-out: clear in-memory auth but keep persisted user in storage
                                        try {
                                            try { await GoogleSignin.revokeAccess(); } catch (_) {
                                                try { await GoogleSignin.signOut(); } catch (_) { /* ignore */ }
                                            }
                                        } catch (e) {
                                            // ignore errors from GoogleSignin (best-effort)
                                        }

                                        await signOut();
                                        // navigation will update automatically via App's auth subscription
                                    }}
                                    style={{ marginRight: 8 }}
                                    iconColor={color.highLighter}
                                />

                                <PrimaryButton
                                    title={simpleT('delete_account', language)}
                                    icon="account-remove"
                                    variant="filled"
                                    onPress={async () => {
                                        // Confirm destructive action
                                        Alert.alert(
                                            simpleT('logout_confirm_title', language),
                                            simpleT('logout_confirm_msg', language),
                                            [
                                                { text: simpleT('cancel', language), style: 'cancel' },
                                                {
                                                    text: simpleT('confirm', language),
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            try { await GoogleSignin.revokeAccess(); } catch (_) {
                                                                try { await GoogleSignin.signOut(); } catch (_) { /* ignore */ }
                                                            }
                                                        } catch (e) {
                                                            // ignore
                                                        }
                                                        // hard sign-out: remove persisted user
                                                        await signOut();
                                                        // navigation will update automatically via App's auth subscription
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    style={{ marginLeft: 8 }}
                                />
                            </View>
                        </View>
                    ) : (
                        <View style={{ padding: 12, backgroundColor: color.card, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                            <Text style={{ color: color.mutedText }}>{simpleT('not_logged_in', language)}</Text>
                        </View>
                    )}

                </View>

                <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('software_settings', language)}</Text>

                    {/* Language dropdown */}
                    {/* NOTE: SETTINGS_KEY now stores an object { language: string } for compatibility with LanguageProvider */}
                        <InfoRow icon="translate" label="语言" text={language === 'zh' ? 'CN' : language === 'en' ? 'ENG' : (language ?? '')} />
                        <InfoRow icon="clock-outline" label="时区" text={(global as any).__pokerpal_settings?.timezone ?? 'GMT+10'} />
                        <InfoRow icon="currency-usd" label="货币" text={`${currency ?? ''} ${getCurrencySymbol(currency) ? `(${getCurrencySymbol(currency)})` : ''}`} />
                    <View style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 8 }}>
                        <SelectField value={language} onChange={(val) => { try { setLanguage(val); } catch (e) { /* ignore */ } }} options={[{ key: 'zh', label: 'CN' }, { key: 'en', label: 'ENG' }]} />
                    </View>
                    <Text style={{ color: color.mutedText, fontSize: 12 }}>{simpleT('save_when_changed', language)}</Text>

                    {/* Only show save/reset when settings changed from last saved state */}
                    {(initialLanguage !== null && language !== initialLanguage) && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                            <PrimaryButton title={simpleT('save', language)} icon="content-save" onPress={save} />
                            <PrimaryButton title={simpleT('reset', language)} icon="restore" variant="outlined" onPress={reset} style={{ marginLeft: 12 }} iconColor={color.valueText} />
                        </View>
                    )}
                    <Text style={{ color: color.mutedText, fontSize: 12, marginTop: 8 }}>{simpleT('logout_explain', language)}</Text>
                </View>

                <View style={{ height: 40 }} />

            </ScrollView>

            {/* MessagePopUp rendered as sibling so overlay can cover full screen */}
            {popup.visible && (
                <MessagePopUp
                    title={popup.title}
                    message={popup.message}
                    isWarning={popup.isWarning}
                    isVisible={popup.visible}
                    onConfirm={popup.onConfirm}
                    onCancel={popup.onCancel}
                />
            )}
        </View>
    );
}
