import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getLocal, setLocal, removeLocal } from '@/services/storageService';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Palette as color } from '@/constants';
import { HomePagestyles as styles } from '@/assets/styles';
import { onAuthStateChanged, signOut } from '@/services/localAuth';
import { fetchUserProfile, UserProfile } from '@/firebase/getUserProfile';
import { useGameStore } from '@/stores/useGameStore';
import SelectField from '@/components/SelectField';
import { InfoRow } from '@/components/InfoRow';
import { InputField } from '@/components/InputField';
import MessagePopUp from '@/components/MessagePopUp';
import { CURRENT_USER_KEY, SETTINGS_KEY } from '@/constants/namingVar';

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

    const [settings, setSettings] = useState<AppSettings>({
        language: 'au',
    });

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
                const parsed = await getLocal<AppSettings>(SETTINGS_KEY);
                if (parsed) {
                    setSettings((s) => ({ ...s, ...parsed }));
                }
                // also load persisted current user (for debug/verification)
                // use a single helper to load persisted user
                const pu = await getLocal(CURRENT_USER_KEY);
                setPersistedUser(pu);
            } catch (e) {
                console.warn('load settings', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // helper to refresh persisted user from storage (used by UI buttons)
    const refreshPersistedUser = async () => {
        try {
            const pu = await getLocal(CURRENT_USER_KEY);
            setPersistedUser(pu);
        } catch (e) {
            console.warn('refresh persisted user', e);
        }
    };

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
                // basic validation (only language now)
                if (!settings.language) throw new Error('请选择语言');
                await setLocal(SETTINGS_KEY, settings);
            setPopup({
                visible: true,
                title: '保存成功',
                message: '设置已保存到本地',
                onConfirm: () => setPopup(prev => ({ ...prev, visible: false })),
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
            });
        } catch (e: any) {
            setPopup({
                visible: true,
                title: '保存失败',
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
            title: '重置设置',
            message: '确定要重置为默认设置吗？',
            isWarning: true,
            onConfirm: async () => {
                const def: AppSettings = { language: 'zh' };
                setSettings(def);
                await removeLocal(SETTINGS_KEY);
                setPopup(prev => ({ ...prev, visible: false }));
            },
            onCancel: () => setPopup(prev => ({ ...prev, visible: false })),
        });
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color.confirm} />
            <Text style={styles.loadingText}>加载设置…</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 18 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>用户信息</Text>
                {user ? (
                    <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                        <Text style={{ fontWeight: '600', color: color.title }}>{profile?.nickname ?? user.displayName ?? '未命名'}</Text>
                        <Text style={{ color: color.text, marginTop: 4 }}>{user.email ?? (user.isAnonymous ? '访客账户' : '')}</Text>
                        <Text style={{ color: color.text, marginTop: 4 }}>身份: {profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                            <PrimaryButton title="退出登录" icon="logout" variant="outlined" onPress={async () => { await signOut(); (navigation as any).navigate('Login'); }} style={{ marginRight: 8 }} iconColor={color.highLighter} />
                        </View>
                    </View>
                ) : (
                    <View style={{ padding: 12, backgroundColor: color.card, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                        <Text style={{ color: color.mutedText }}>未登录</Text>
                    </View>
                )}
                <View style={{ marginTop: 12 }}>
                    <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>持久化用户（storage）</Text>
                    <View style={{ padding: 12, backgroundColor: color.lightBackground, borderRadius: 8, borderWidth: 1, borderColor: color.borderColor }}>
                        {persistedUser ? (
                            <>
                                <Text style={{ color: color.text, marginBottom: 6 }}>UID: {persistedUser.uid}</Text>
                                <Text style={{ color: color.text, marginBottom: 6 }}>昵称: {persistedUser.displayName ?? persistedUser.nickname ?? '—'}</Text>
                                <Text style={{ color: color.text, marginBottom: 6 }}>邮箱: {persistedUser.email ?? '—'}</Text>
                                <Text style={{ color: color.text, marginBottom: 6 }}>照片: {persistedUser.photoURL ?? persistedUser.photo ?? '—'}</Text>
                                <Text style={{ color: color.mutedText, marginTop: 8 }}>原始: {JSON.stringify(persistedUser)}</Text>
                                <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                                    <PrimaryButton title="刷新" icon="refresh" variant="outlined" onPress={refreshPersistedUser} style={{ marginRight: 8 }} />
                                    <PrimaryButton title="清除" icon="delete" variant="outlined" onPress={async () => {
                                        try {
                                            await removeLocal(CURRENT_USER_KEY);
                                            setPersistedUser(null);
                                        } catch (e) {
                                            console.warn('remove persisted user', e);
                                        }
                                    }} iconColor={color.error} />
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={{ color: color.mutedText }}>未检测到持久化用户</Text>
                                <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                                    <PrimaryButton title="刷新" icon="refresh" variant="outlined" onPress={refreshPersistedUser} />
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>

            <View style={{ marginBottom: 18 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8, color: color.title }}>软件设置</Text>

                {/* Language dropdown */}
                <InfoRow icon="translate" label="语言" text={settings.language === 'zh' ? 'CN' : settings.language === 'en' ? 'ENG' : (settings.language ?? '')} />
                <View style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 16 }}>
                    <SelectField value={settings.language} onChange={(val) => setSettings(s => ({ ...s, language: val }))} options={[{ key: 'zh', label: 'CN' }, { key: 'en', label: 'ENG' }]} />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <PrimaryButton title="保存" icon="content-save" onPress={save} />
                    <PrimaryButton title="重置" icon="restore" variant="outlined" onPress={reset} style={{ marginLeft: 12 }} iconColor={color.valueText} />
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
