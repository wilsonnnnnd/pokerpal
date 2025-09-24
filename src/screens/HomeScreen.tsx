import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    ActivityIndicator,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RootStackParamList } from '../../App';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useGameStore } from '@/stores/useGameStore';
import { useStoreReady } from '@/hooks/useStoreReady';

import { Palette as color } from '@/constants';
import { GameSetupCard } from '@/components/GameSetupCard';
import { usePopup } from '@/components/PopupProvider';
import { deleteGame } from '@/services/gameStoreDb';
import Toast from 'react-native-toast-message';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { HomePagestyles as styles } from '@/assets/styles';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { onAuthStateChanged, signOut } from '@/services/localAuth';
import storage from '@/services/storageService';
import { fetchUserProfile, UserProfile } from '@/firebase/getUserProfile';
import { CURRENT_USER_KEY } from '@/constants/namingVar';
import usePermission from '@/hooks/usePermission';

type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNav>();
    const [user, setUser] = useState<{ uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null; isAnonymous?: boolean; profile?: UserProfile } | null>(null);
    const [persistedUser, setPersistedUser] = useState<any | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { finalized, gameId } = useGameStore((state) => state);
    const isReady = useStoreReady();
    const { confirmPopup } = usePopup();
    const { isHost } = usePermission();

    useEffect(() => {
        if (!finalized && gameId) {
            const confirmation = async () => {
                try {
                    const result = await confirmPopup({
                        title: '继续上次游戏？',
                        message: '检测到您有未完成的游戏，是否继续？',
                    });

                    if (result) {
                        navigation.navigate('GamePlay', { gameId });

                    } else {
                        await deleteGame(gameId);
                        useGameStore.getState().resetGame();
                        usePlayerStore.getState().resetPlayers();

                        Toast.show({
                            type: 'info',
                            text1: '游戏已重置',
                            text2: '您可以开始新的游戏。',
                            position: 'bottom',
                            visibilityTime: 2000,
                        });


                    }
                } catch (e) {
                    Toast.show({
                        type: 'error',
                        text1: '错误',
                        text2: '无法加载游戏数据，请稍后再试。',
                    });
                }
            };

            confirmation();
        }
    }, []);

    // Subscribe to auth state and fetch profile
    useEffect(() => {
        const unsub = onAuthStateChanged(async (u: any) => {
            if (!u) {
                setUser(null);
                return;
            }

            const profile = await fetchUserProfile(u.uid);
            setUser({ uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, isAnonymous: u.isAnonymous, profile: profile ?? undefined });
            // load persisted user for avatar/name preference
            try {
                const pu = await storage.getLocal(CURRENT_USER_KEY);
                setPersistedUser(pu);
            } catch (e) {
                // ignore
            }
        });

        return () => unsub && unsub();
    }, []);

    if (!isReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={color.confirm} />
                <Text style={styles.loadingText}>正在加载存储...</Text>
            </View>
        );
    }

    return (
        <>
            <ScrollView style={[styles.container, { paddingTop: Spacing.lg }]}>
                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <MaterialCommunityIcons
                            name="cards-playing-outline"
                            size={64}
                            color={color.highLighter}
                            style={styles.icon}
                        />
                        <Text style={styles.title}>德州扑克筹码记录器✍️</Text>

                    </View>
                        {/* user card */}
                        {user && (
                            <View style={styles.userCard}>
                                <View style={styles.userInfoContainer}>
                                    <TouchableOpacity onPress={() => navigation.navigate('GamePlayerRank')}>
                                        {(
                                            // Prefer persistedUser.photoURL if available, otherwise fallback to user.photoURL
                                            (persistedUser?.photoURL ?? user.photoURL)
                                        ) ? (
                                            <Image source={{ uri: (persistedUser?.photoURL ?? user.photoURL) }} style={styles.userAvatar} />
                                        ) : (
                                            <View style={styles.userAvatar}>
                                                <Text style={{ color: color.text, fontWeight: '700', fontSize: FontSize.h3 }}>{((persistedUser?.displayName ?? user.displayName) || '访客').slice(0, 1)}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{(persistedUser?.displayName ?? user.displayName) ?? (user.profile?.nickname ?? (user.isAnonymous ? '访客' : '未命名'))}</Text>
                                        <Text style={styles.userEmail}>{persistedUser?.email ?? user.email ?? (user.isAnonymous ? '访客账户' : '')}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.userEmail, { marginRight: 8 }]}>身份: {user.profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}</Text>
                                            {isHost && (
                                                <View style={{
                                                    backgroundColor: color.highLighter,
                                                    paddingHorizontal: Spacing.sm,
                                                    paddingVertical: Spacing.xs,
                                                    borderRadius: Radius.sm,
                                                    flexDirection: 'row',
                                                    alignItems: 'center'
                                                }}>
                                                    <MaterialCommunityIcons name="crown" size={12} color={color.darkGray} />
                                                    <Text style={{ fontSize: 10, color: color.darkGray, fontWeight: '600', marginLeft: 2 }}>VIP</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>


                            </View>
                        )}

                    <View style={styles.buttonsSection}>
                        <View style={styles.actionsCard}>
                            {/* use a configuration list for buttons so we can conditionally show them */}
                            <PrimaryButton
                                title="开始游戏"
                                icon="play-circle"
                                iconColor={color.lightText}
                                onPress={() => setModalVisible(true)}
                                style={[styles.startGameButton, { borderRadius: 10 }]}
                                size="large"
                                fullWidth={true}
                            />

                            {[
                                {
                                    key: 'history',
                                    title: '游戏历史',
                                    icon: 'history',
                                    onPress: () => navigation.navigate('GameHistory'),
                                },
                                {
                                    key: 'localHistory',
                                    title: '本地历史',
                                    icon: 'history',
                                    onPress: () => navigation.navigate('Database'),
                                },
                                {
                                    key: 'ranking',
                                    title: '玩家排行',
                                    icon: 'account-group',
                                    onPress: () => navigation.navigate('GamePlayerRank'),
                                },
                                {
                                    key: 'settings',
                                    title: '全局设置',
                                    icon: 'cog-outline',
                                    onPress: () => navigation.navigate('Settings'),
                                },
                            ].map((btn) => {
                                // determine visibility: by default visible
                                const visible = (() => {
                                    // example: only host can see settings
                                    if (btn.key === 'history' || btn.key === 'ranking') return isHost;
                                    return true;
                                })();

                                if (!visible) return null;

                                return (
                                    <View key={btn.key} style={[styles.buttonRow, { marginTop: Spacing.sm }]}>
                                        <PrimaryButton
                                            title={btn.title}
                                            icon={btn.icon as any}
                                            variant="outlined"
                                            onPress={btn.onPress}
                                            style={[styles.secondaryButton, { width: '100%' }]}
                                            iconColor={color.info}
                                        />
                                    </View>
                                );
                            })}

                            <PrimaryButton
                                title="退出登录"
                                icon="logout"
                                variant="outlined"
                                onPress={async () => {
                                    try {
                                        await signOut();
                                        useGameStore.getState().resetGame();
                                        usePlayerStore.getState().resetPlayers();
                                        Toast.show({ type: 'success', text1: '已退出登录' });
                                        // navigation will switch to AuthNavigator via auth subscription in App
                                    } catch (e) {
                                        Toast.show({ type: 'error', text1: '退出登录失败' });
                                    }
                                }}
                                style={[styles.logoutButton, { marginTop: Spacing.sm }]}
                                iconColor={color.error}
                            />
                        </View>
                    </View>
                    {/* 新游戏设置弹窗 */}
                    <Modal visible={modalVisible} transparent animationType="fade">
                        <View style={styles.overlay}>
                            <GameSetupCard
                                onConfirm={() => {
                                    const { gameId } = useGameStore.getState(); // 重新获取 gameId
                                    setModalVisible(false);
                                    navigation.navigate('GamePlay', { gameId });
                                }}
                                onCancel={() => setModalVisible(false)}
                            />

                        </View>
                    </Modal>

                </View>
            </ScrollView>
            <View style={styles.footerSection}>
                <Text style={styles.footerText}>
                    版本 1.0.0 · 轻松记录每局游戏
                </Text>
            </View>

        </>
    );
};



export default HomeScreen;