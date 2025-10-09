import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getLocal, removeLocal, setLocal } from '@/services/storageService';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged, signOut } from '@/services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
import { usePermission } from '@/hooks/usePermission';
import { getLastUpdateTime } from '@/utils/exchangeRateUtils';
import { UserProfile } from '@/types';

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
        exchangeRates,
        updateExchangeRates,
        clearRateCache,
        isUpdatingRates
    } = useSettings();
    
    // 权限检查 - 只有host用户可以看到汇率管理
    const { isHost, loading: permissionLoading } = usePermission();
    // snapshot of saved language/currency to detect changes
    const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
    const [initialCurrency, setInitialCurrency] = useState<string | null>(null);
    const initialSetRef = React.useRef(false);
    const initialCurrencySetRef = React.useRef(false);
    
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
                
                // 加载汇率更新时间
                if (isHost) {
                    try {
                        const updateTime = await getLastUpdateTime('AUD');
                        setLastRateUpdate(updateTime);
                    } catch (e) {
                        console.warn('Failed to get last rate update time:', e);
                    }
                }
            } catch (e) {
                console.warn('load settings', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [isHost]);

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
                // 使用设备时区作为默认值
                const deviceTimezone = getDeviceTimezone();
                const defaults = { language: 'zh', timezone: deviceTimezone, currency: 'AUD' };
                try { await setLanguage(defaults.language); } catch (e) { /* ignore */ }
                try { await setTimezone(defaults.timezone); } catch (e) { /* ignore */ }
                try { await setLocal(SETTINGS_KEY, defaults); } catch (e) { /* ignore */ }
                setInitialLanguage(defaults.language);
                setInitialCurrency(defaults.currency);
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

    // 更新汇率
    const handleUpdateExchangeRates = async () => {
        try {
            await updateExchangeRates();
            
            // 直接使用 exchangeRateUtils 获取更新时间
            const lastUpdate = await getLastUpdateTime('AUD');
            setLastRateUpdate(lastUpdate);
            
            setPopup({
                visible: true,
                title: simpleT('rates_updated', language),
                message: `${simpleT('rates_updated_msg', language)}${lastUpdate ? `\n${simpleT('last_update', language)}: ${lastUpdate}` : ''}`,
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } catch (e: any) {
            setPopup({
                visible: true,
                title: simpleT('rates_update_failed', language),
                message: e?.message || simpleT('rates_update_failed_msg', language),
                isWarning: true,
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        }
    };

    // 清除汇率缓存
    const handleClearRateCache = async () => {
        setPopup({
            visible: true,
            title: simpleT('clear_rate_cache', language),
            message: simpleT('clear_rate_cache_confirm', language),
            isWarning: true,
            onConfirm: async () => {
                try {
                    await clearRateCache();
                    // 清除缓存后，重置更新时间显示
                    setLastRateUpdate(null);
                    
                    setPopup({
                        visible: true,
                        title: simpleT('cache_cleared', language),
                        message: simpleT('cache_cleared_msg', language),
                        onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                        onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
                    });
                } catch (e: any) {
                    setPopup({
                        visible: true,
                        title: simpleT('cache_clear_failed', language),
                        message: e?.message || simpleT('cache_clear_failed_msg', language),
                        isWarning: true,
                        onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                        onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
                    });
                }
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
                            <Text style={{ fontWeight: '600', color: color.title }}>{ user.displayName ?? simpleT('unnamed', language)}</Text>
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
                    {/* NOTE: SETTINGS_KEY stores an object { language, timezone, currency } and is managed by SettingsProvider */}
                        <InfoRow icon="translate" label="语言" text={language === 'zh' ? 'CN' : language === 'en' ? 'ENG' : (language ?? '')} />
                        <InfoRow icon="clock-outline" label="时区" text={getTimezoneDisplayName(timezone)} />
                        <InfoRow icon="currency-usd" label="货币" text={`${currency ?? ''} ${getCurrencySymbol(currency) ? `(${getCurrencySymbol(currency)})` : ''}`} />
                    
                    {/* 语言设置 */}
                    <View style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 8 }}>
                        <SelectField value={language} onChange={(val) => { try { setLanguage(val); } catch (e) { /* ignore */ } }} options={[{ key: 'zh', label: 'CN' }, { key: 'en', label: 'ENG' }]} />
                    </View>

                    {/* 时区管理 */}
                    <View style={{ marginTop: 16, marginBottom: 8 }}>
                        <Text style={{ fontWeight: '600', marginBottom: 8, color: color.title }}>{simpleT('timezone_management', language)}</Text>
                        
                        {/* 自动检测时区按钮 */}
                        <View style={{ marginBottom: 12 }}>
                            <PrimaryButton
                                title={simpleT('auto_detect_timezone', language)}
                                icon="map-marker"
                                variant="outlined"
                                onPress={autoDetectTimezone}
                                style={{ backgroundColor: color.card }}
                                textStyle={{ color: color.primary }}
                                iconColor={color.primary}
                            />
                        </View>

                        {/* 手动时区选择 */}
                        <View style={{ paddingHorizontal: 12 }}>
                            <SelectField 
                                value={timezone} 
                                onChange={handleTimezoneChange}
                                options={getCommonTimezones()}
                            />
                        </View>
                        
                        <Text style={{ color: color.mutedText, fontSize: 12, marginTop: 4, paddingHorizontal: 12 }}>
                            {simpleT('current_timezone', language)}: {getTimezoneDisplayName(timezone)}
                        </Text>
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

                {/* 汇率管理部分 - 只有host用户可见 */}
                {isHost && (
                    <View style={{ marginBottom: 18 }}>
                        <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('exchange_rate_management', language)}</Text>
                        
                        <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                            <Text style={{ color: color.text, marginBottom: 12 }}>{simpleT('exchange_rate_description', language)}</Text>
                            
                            {/* 当前汇率显示 - 显示AUD兑换CNY和更新时间 */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 8, color: color.title }}>{simpleT('current_rates', language)}:</Text>
                                {exchangeRates.CNY ? (
                                    <View>
                                        <Text style={{ color: color.text, fontSize: 14, marginBottom: 2, fontWeight: '500' }}>
                                            1 AUD = ¥{exchangeRates.CNY.toFixed(4)} CNY
                                        </Text>
                                        {lastRateUpdate && (
                                            <Text style={{ color: color.mutedText, fontSize: 11, marginTop: 2 }}>
                                                {simpleT('last_update', language)}: {lastRateUpdate}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={{ color: color.mutedText, fontSize: 12, marginBottom: 2 }}>
                                        {simpleT('no_rate_data', language)}
                                    </Text>
                                )}
                            </View>

                            {/* 汇率管理按钮 */}
                            <View style={{ flexDirection: 'row' }}>
                                <View style={{ flex: 1, marginRight: 4 }}>
                                    <PrimaryButton
                                        title={isUpdatingRates ? simpleT('updating_rates', language) : simpleT('update_rates', language)}
                                        icon="refresh"
                                        variant="outlined"
                                        onPress={handleUpdateExchangeRates}
                                        disabled={isUpdatingRates}
                                        style={{ backgroundColor: color.card }}
                                        textStyle={{ color: color.primary }}
                                        iconColor={color.primary}
                                    />
                                </View>
                                
                                <View style={{ flex: 1, marginLeft: 4 }}>
                                    <PrimaryButton
                                        title={simpleT('clear_cache', language)}
                                        icon="cached"
                                        variant="outlined"
                                        onPress={handleClearRateCache}
                                        style={{ backgroundColor: color.card }}
                                        textStyle={{ color: color.warning }}
                                        iconColor={color.warning}
                                    />
                                </View>
                            </View>
                            
                            <Text style={{ color: color.mutedText, fontSize: 11, marginTop: 8 }}>
                                {simpleT('rate_data_source', language)}: exchangerate-api.com (24小时缓存)
                            </Text>
                        </View>
                    </View>
                )}

                {/* 数据管理部分 */}
                <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>{simpleT('data_management', language)}</Text>
                    
                    <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                        <Text style={{ color: color.text, marginBottom: 12 }}>{simpleT('clear_database_description', language)}</Text>
                        
                        <PrimaryButton
                            title={simpleT('clear_database', language)}
                            icon="database-remove"
                            variant="filled"
                            onPress={clearDatabase}
                            style={{ backgroundColor: color.error }}
                            textStyle={{ color: color.background }}
                        />
                    </View>
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
