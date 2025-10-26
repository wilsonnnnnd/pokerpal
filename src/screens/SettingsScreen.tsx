import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getLocal, removeLocal, setLocal } from '@/services/storageService';
import { PrimaryButton } from '@/components/common/PrimaryButton';
import { Palette as color } from '@/constants';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged } from '@/services/authService';
import { fetchUserProfile } from '@/firebase/getUserProfile';
import MessagePopUp from '@/components/MessagePopUp';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';
import { useSettings } from '@/providers/SettingsProvider';
import simpleT from '@/i18n/simpleT';
import { DEFAULT_CURRENCY, DEFAULT_UI_LANGUAGE } from '@/constants/appConfig';
import { execSql } from '@/services/localDb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoftwareSettings from '@/components/settings/SoftwareSettings';
import ExchangeManagement from '@/components/settings/ExchangeManagement';
import DataManagement from '@/components/settings/DataManagement';
import { usePermission } from '@/hooks/usePermission';
import { UserProfile } from '@/types';
import { useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { auth as firebaseAuth } from '@/firebase/config';
import { signOut } from '@/services/authService';
import { usePopup } from '@/providers/PopupProvider';

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
        currency,
    } = useSettings();

    // 权限检查 - 只有host用户可以看到汇率管理
    const { isHost, loading: permissionLoading } = usePermission();

    // popup helper from provider
    const { confirmPopup } = usePopup();
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
                console.debug('Loading persisted settings in SettingsScreen', language, currency);
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
            if (!language) throw new Error(simpleT('choose_language'));
            // ensure provider persists
            await setLanguage(language);
            // currency is read-only here; persist existing currency value into SETTINGS_KEY
            try {
                const existing = await getLocal<any>(SETTINGS_KEY);
                const merged = { ...(existing || {}), language, currency: existing?.currency ?? (global as any).__pokerpal_settings?.currency ?? DEFAULT_CURRENCY };
                await setLocal(SETTINGS_KEY, merged).catch(() => { });
                try { (global as any).__pokerpal_settings = merged; } catch (e) { /* ignore */ }
            } catch (e) { /* ignore */ }
            setInitialLanguage(language);
            setPopup({
                visible: true,
                title: simpleT('save_success_title'),
                message: simpleT('save_success_msg'),
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } catch (e: any) {
            setPopup({
                visible: true,
                title: simpleT('save_fail_title'),
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
            title: simpleT('reset_title'),
            message: simpleT('reset_confirm_msg'),
            isWarning: true,
            onConfirm: async () => {
                // 使用默认设置（时区已移除）
                const defaults = { language: DEFAULT_UI_LANGUAGE, currency: DEFAULT_CURRENCY };
                try { await setLanguage(defaults.language); } catch (e) { /* ignore */ }
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
            title: simpleT('clear_database_title'),
            message: simpleT('clear_database_confirm'),
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
                        title: simpleT('clear_success_title'),
                        message: simpleT('clear_success_msg'),
                        onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                        onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
                    });
                } catch (e: any) {
                    setPopup({
                        visible: true,
                        title: simpleT('clear_fail_title'),
                        message: e?.message || simpleT('clear_fail_msg'),
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

    const handleDeleteAccount = async () => {
        // Decide message and behavior based on whether the user is anonymous
        const isAnon = !!user?.isAnonymous;
    const title = simpleT('delete_account') || '删除账户';
    const anonMsg = simpleT('delete_anon_confirm');
    const nonAnonMsg = simpleT('delete_non_anon_confirm', undefined, { days: 7 });

        // Use centralized confirm popup
        const confirmed = await confirmPopup({
            title,
            message: isAnon ? anonMsg : nonAnonMsg,
            isWarning: true,
        });

        if (!confirmed) return;

        setLoading(true);

        // helper: clear local DB and game-related AsyncStorage keys
        const clearLocalHistory = async () => {
            try {
                const tables = ['players', 'games', 'game_players', 'actions'];
                for (const table of tables) {
                    try { await execSql(`DELETE FROM ${table}`); } catch (e) { /* ignore */ }
                }

                if ((global as any).__pokerpal_store) {
                    (global as any).__pokerpal_store = {
                        players: [],
                        games: [],
                        game_players: [],
                        actions: [],
                        _id: 1
                    };
                }

                const keys = await AsyncStorage.getAllKeys();
                const gameRelatedKeys = keys.filter(key =>
                    key.includes('game') || key.includes('player') || key.includes('history') || key.includes('__pokerpal_store') || key.includes('GAME_') || key.includes('PLAYER_')
                );

                if (gameRelatedKeys.length > 0) {
                    await AsyncStorage.multiRemove(gameRelatedKeys);
                }
            } catch (err) {
                // ignore
            }
        };

        try {
            const auth = getAuth();
            const current = auth.currentUser as any | null;

            if (!current) {
                await confirmPopup({ title, message: simpleT('no_user_detected'), isWarning: true });
                return;
            }

            // 获取 idToken（与 attachAuthHeader 相同的方式）用于后续需要鉴权的请求
            const idToken = await getIdTokenForRequest(true);
            const exampleAuthHeaders = idToken ? { Authorization: `Bearer ${idToken}` } : {};
            console.debug('prepared auth headers for delete flow', !!exampleAuthHeaders.Authorization);

            // Anonymous: delete account and clear local history immediately
            if (isAnon) {
                try {
                    await current.delete();
                } catch (err: any) {
                    // deletion might still fail; report
                    await confirmPopup({ title, message: err?.message || String(err) || simpleT('delete_failed'), isWarning: true });
                    return;
                }

                // clear local history
                await clearLocalHistory();
                try { await removeLocal(CURRENT_USER_KEY); } catch (e) { /* ignore */ }
                try { await removeLocal(SETTINGS_KEY); } catch (e) { /* ignore */ }
                await signOut();

                await confirmPopup({ title, message: simpleT('anon_deleted_msg') });
                return;
            }

            // Non-anonymous: schedule server-side deletion (soft-delete) by writing a pending request
            try {
                // write a deletion request document that backend will act on after 7 days
                const uid = String(current.uid ?? current?.uid);
                try {
                    const { requestAccountDeletion } = await import('@/firebase/requestAccountDeletion');
                    await requestAccountDeletion(uid, 7);
                } catch (e) {
                    // fallback: try direct import if dynamic import fails
                    const { requestAccountDeletion } = await import('@/firebase/requestAccountDeletion');
                    await requestAccountDeletion(uid, 7);
                }

                // locally clear history and sign out user immediately
                await clearLocalHistory();
                try { await removeLocal(CURRENT_USER_KEY); } catch (e) { /* ignore */ }
                try { await removeLocal(SETTINGS_KEY); } catch (e) { /* ignore */ }
                await signOut();

                await confirmPopup({ title, message: simpleT('deletion_request_created', undefined, { days: 7 }) });
                return;
            } catch (err: any) {
                await confirmPopup({ title, message: err?.message || String(err) || simpleT('delete_failed'), isWarning: true });
                return;
            }
        } catch (e: any) {
            await confirmPopup({ title, message: e?.message || String(e) || simpleT('delete_failed'), isWarning: true });
        } finally {
            setLoading(false);
        }
    };

    // Helper to get idToken similar to attachAuthHeader implementation
    const getIdTokenForRequest = async (forceRefresh = false): Promise<string | null> => {
        try {
            const { getFreshIdToken } = await import('@/services/authToken');
            return await getFreshIdToken({ force: !!forceRefresh });
        } catch (e) {
            return null;
        }
    };


    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color.confirm} />
            <Text style={styles.loadingText}>{simpleT('loading_settings')}</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
                <SoftwareSettings language={language} currency={currency} />

                {/* 汇率管理部分 - 只有host用户可见 */}
                {isHost && <ExchangeManagement language={language} setLastRateUpdate={setLastRateUpdate} />}

                {/* 数据管理部分 */}
                <DataManagement language={language} onClear={clearDatabase} />
                {/* Language and currency now persist immediately when changed in the UI; no explicit save required */}
                {/* Delete account button - only show if a user is signed in */}
                {user && (
                    <View style={{ marginTop: 12 }}>
                        <PrimaryButton title={simpleT('delete_account')} icon="delete" variant="outlined" onPress={handleDeleteAccount} style={{ borderColor: color.error }} iconColor={color.error} />
                    </View>
                )}
                <View style={styles.actionSpacer} />

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
