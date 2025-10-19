import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getLocal, removeLocal, setLocal } from '@/services/storageService';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged, signOut } from '@/services/authService';
import { GoogleAuthService } from '@/services/googleAuthService';
import { fetchUserProfile } from '@/firebase/getUserProfile';
import SelectField from '@/components/SelectField';
import { commonCurrencies, getCurrencySymbol } from '@/constants/currency';
import { InfoRow } from '@/components/InfoRow';
import MessagePopUp from '@/components/MessagePopUp';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';
import { useSettings } from '@/providers/SettingsProvider';
import { simpleT } from '@/i18n/simpleT';
import { execSql } from '@/services/localDb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceTimezone, getTimezoneDisplayName, getCommonTimezones, autoDetectAndUpdateTimezone } from '@/utils/timezoneUtils';
import UserInfoCard from '@/components/settings/UserInfoCard';
import SoftwareSettings from '@/components/settings/SoftwareSettings';
import ExchangeManagement from '@/components/settings/ExchangeManagement';
import DataManagement from '@/components/settings/DataManagement';
import { usePermission } from '@/hooks/usePermission';
import { UserProfile } from '@/types';
import { useCallback } from 'react';

// (use SelectField component for dropdowns)

export default function SettingsScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [persistedUser, setPersistedUser] = useState<any | null>(null);

    // Use global settings provider (language, timezone, currency handled by SettingsProvider)
    const {
        language,
        setLanguage,
        timezone,
        setTimezone,
        currency,
    } = useSettings();

    // 权限检查 - 只有host用户可以看到汇率管理
    const { isHost, loading: permissionLoading } = usePermission();
    // snapshot of saved language/currency to detect changes
    const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
    const initialSetRef = React.useRef(false);

    // 汇率详细信息状态
    const [lastRateUpdate, setLastRateUpdate] = useState<string | null>(null);

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
                    // language/timezone/currency are loaded by SettingsProvider; just load persisted user for debug
                    const pu = await getLocal(CURRENT_USER_KEY);
                    setPersistedUser(pu);
                } catch (e) {
                    console.warn('load settings', e);
                } finally {
                    setLoading(false);
                }
            })();
    }, [isHost]);

    // SettingsExchangeCard is imported from components and reused here

    // set initialLanguage & initialCurrency once when provider has loaded persisted values
    useEffect(() => {
        if (!initialSetRef.current && language) {
            setInitialLanguage(language);
            initialSetRef.current = true;
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
                setProfile(p ? { ...p, uid: u.uid } : null);
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
                await setLocal(SETTINGS_KEY, merged).catch(() => { });
                try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
            } catch (e) { /* ignore */ }
            setInitialLanguage(language);
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
                // 使用设备时区作为默认值
                const deviceTimezone = getDeviceTimezone();
                const defaults = { language: 'zh', timezone: deviceTimezone, currency: 'AUD' };
                try { await setLanguage(defaults.language); } catch (e) { /* ignore */ }
                try { await setTimezone(defaults.timezone); } catch (e) { /* ignore */ }
                try { await setLocal(SETTINGS_KEY, defaults); } catch (e) { /* ignore */ }
                setInitialLanguage(defaults.language);
                setPopup(prev => ({ ...prev, visible: false }));
            },
            onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
        });
    };

    const clearDatabase = async () => {
        setPopup({
            visible: true,
            title: simpleT('clear_database_title', language),
            message: simpleT('clear_database_confirm', language),
            isWarning: true,
            onConfirm: async () => {
                setPopup(prev => ({ ...prev, visible: false }));
                setLoading(true);

                try {
                    // 清除 SQLite 数据库表
                    const tables = ['players', 'games', 'game_players', 'actions'];
                    for (const table of tables) {
                        try {
                            await execSql(`DELETE FROM ${table}`);
                        } catch (e) {
                            console.warn(`Failed to clear table ${table}:`, e);
                        }
                    }

                    // 清除内存中的数据存储
                    if ((global as any).__pokerpal_store) {
                        (global as any).__pokerpal_store = {
                            players: [],
                            games: [],
                            game_players: [],
                            actions: [],
                            _id: 1
                        };
                    }

                    // 清除 AsyncStorage 中的游戏相关数据（保留用户设置）
                    const keys = await AsyncStorage.getAllKeys();
                    const gameRelatedKeys = keys.filter(key =>
                        key.includes('game') ||
                        key.includes('player') ||
                        key.includes('history') ||
                        key.includes('__pokerpal_store') ||
                        key.includes('GAME_') ||
                        key.includes('PLAYER_')
                    );

                    if (gameRelatedKeys.length > 0) {
                        await AsyncStorage.multiRemove(gameRelatedKeys);
                    }

                    setPopup({
                        visible: true,
                        title: simpleT('clear_success_title', language),
                        message: simpleT('clear_success_msg', language),
                        onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                        onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
                    });
                } catch (e: any) {
                    setPopup({
                        visible: true,
                        title: simpleT('clear_fail_title', language),
                        message: e?.message || simpleT('clear_fail_msg', language),
                        isWarning: true,
                        onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                        onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
                    });
                } finally {
                    setLoading(false);
                }
            },
            onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
        });
    };

    // 自动检测并更新设备时区
    const autoDetectTimezone = async () => {
        try {
            setLoading(true);
            const deviceTimezone = getDeviceTimezone();

            // 使用 SettingsProvider 的 setTimezone 来更新时区
            await setTimezone(deviceTimezone);

            setPopup({
                visible: true,
                title: simpleT('timezone_updated', language),
                message: `${simpleT('timezone_detected', language)}: ${getTimezoneDisplayName(deviceTimezone)}`,
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } catch (e: any) {
            setPopup({
                visible: true,
                title: simpleT('timezone_error', language),
                message: e?.message || simpleT('timezone_error_msg', language),
                isWarning: true,
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } finally {
            setLoading(false);
        }
    };

    // 手动设置时区
    const handleTimezoneChange = async (newTimezone: string) => {
        try {
            await setTimezone(newTimezone);
        } catch (e) {
            console.warn('Failed to set timezone:', e);
        }
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
                <UserInfoCard user={user} profile={profile} language={language} />

                <SoftwareSettings language={language} timezone={timezone} currency={currency} setLanguage={setLanguage} setTimezone={setTimezone} />

                {/* 汇率管理部分 - 只有host用户可见 */}
                {isHost && <ExchangeManagement language={language} setLastRateUpdate={setLastRateUpdate} />}

                {/* 数据管理部分 */}
                <DataManagement language={language} onClear={clearDatabase} />
                {(initialLanguage !== null && language !== initialLanguage) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                        <PrimaryButton title={simpleT('save', language)} icon="content-save" onPress={save} />
                        <PrimaryButton title={simpleT('reset', language)} icon="restore" variant="outlined" onPress={reset} style={{ marginLeft: 12 }} iconColor={color.valueText} />
                    </View>
                )}
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
