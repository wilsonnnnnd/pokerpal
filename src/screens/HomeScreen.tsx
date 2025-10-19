import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    ActivityIndicator,
    ScrollView,
    Image,
    TouchableOpacity,
    BackHandler,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../../App';
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
import { onAuthStateChanged, signOut } from '@/services/authService';
import storage from '@/services/storageService';
import { fetchUserProfile } from '@/firebase/getUserProfile';
import { CURRENT_USER_KEY } from '@/constants/namingVar';
import usePermission from '@/hooks/usePermission';
import { useLogger } from '@/utils/useLogger';
import { UserProfile } from '@/types';
import appConfig from '../../app.json';

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
    const { clearLogs } = useLogger();

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
                        clearLogs(); // 清除之前游戏的日志缓存

                        Toast.show({
                            type: 'info',
                            text1: '游戏已重置',
                            text2: '您可以开始新的游戏。',
                            position: 'bottom',
                            visibilityTime: 2000,
                        });

                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
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

            try {
                const firestoreProfile = await fetchUserProfile(u.uid);
                // 构建用户对象，优先使用 Firestore 数据
                const userWithProfile = {
                    uid: u.uid,
                    email: firestoreProfile?.email || u.email,
                    displayName: firestoreProfile?.nickname || u.displayName,
                    photoURL: firestoreProfile?.photoURL || u.photoURL,
                    isAnonymous: u.isAnonymous,
                    profile: firestoreProfile ? {
                        ...firestoreProfile,
                        uid: u.uid,
                        displayName: firestoreProfile.nickname,
                    } : undefined
                };

                setUser(userWithProfile);

                // load persisted user for avatar/name preference
                try {
                    const pu = await storage.getLocal(CURRENT_USER_KEY);
                    setPersistedUser(pu);
                } catch (e) {
                    // ignore
                }
            } catch (error) {
                console.warn('获取用户档案失败:', error);
                // 即使获取 Firestore 档案失败，也设置基础用户信息
                setUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName,
                    photoURL: u.photoURL,
                    isAnonymous: u.isAnonymous,
                    profile: undefined
                });
            }
        });

        return () => unsub && unsub();
    }, []);

    // 禁用返回和侧滑（当页面处于焦点时）
    useFocusEffect(
        useCallback(() => {
            // 拦截 Android 返回键
            const onBackPress = () => {
                // 阻止返回
                return true;
            };
            const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            // 禁用侧滑返回（iOS）
            navigation.setOptions({ gestureEnabled: false });

            return () => {
                // 恢复默认行为
                sub.remove();
                navigation.setOptions({ gestureEnabled: true });
            };
        }, [navigation])
    );

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
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Hero Section with Gradient */}
                <LinearGradient
                    colors={[color.primary, color.highLighter]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroGradient}
                >
                    <View style={styles.icon}>
                        <MaterialCommunityIcons
                            name="cards-playing-outline"
                            size={72}
                            color={color.lightText}
                        />
                    </View>
                    <Text style={styles.title}>德州扑克筹码记录器</Text>
                    <Text style={styles.subtitle}>轻松管理，精确记录</Text>
                </LinearGradient>

                <View style={styles.mainContent}>
                    {/* User Profile Card */}
                    {user && (
                        <View style={[styles.userCard, {
                            marginBottom: Spacing.lg,
                            backgroundColor: color.lightBackground, // 使用纯白背景
                            borderWidth: 1,
                            borderColor: color.lightGray + '60',
                            shadowColor: color.shadowLight,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 3,
                        }]}>
                            <View style={styles.userInfoContainer}>
                                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                                    {user.photoURL ? (
                                        <View style={{
                                            borderRadius: Radius.round,
                                            padding: 3,
                                            shadowColor: color.shadowLight,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 4,
                                            elevation: 2,
                                        }}>
                                            <Image
                                                source={{ uri: user.photoURL }}
                                                style={[styles.userAvatar, { borderRadius: Radius.round }]}
                                            />
                                        </View>
                                    ) : (
                                        <View style={[styles.userAvatar, {
                                            backgroundColor: color.primary,
                                            borderWidth: 3,
                                            borderColor: color.background,
                                            shadowColor: color.shadowLight,
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 4,
                                            elevation: 2,
                                        }]}>
                                            <Text style={{
                                                color: color.lightText,
                                                fontWeight: '800',
                                                fontSize: FontSize.h2
                                            }}>
                                                {(user.displayName || '访客').slice(0, 1)}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.userInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs }}>
                                        <Text style={[styles.userName, { flex: 1 }]}>
                                            {user.displayName ??
                                                (user.isAnonymous ? '访客' : '未命名')}
                                        </Text>
                                        {isHost && (
                                            <LinearGradient
                                                colors={[color.primary, color.highLighter]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[styles.vipBadge, {
                                                    borderRadius: Radius.sm,
                                                    paddingHorizontal: Spacing.sm,
                                                    paddingVertical: 2,
                                                    shadowColor: color.shadowLight,
                                                    shadowOffset: { width: 0, height: 1 },
                                                    shadowOpacity: 0.2,
                                                    shadowRadius: 2,
                                                    elevation: 1,
                                                }]}
                                            >
                                                <MaterialCommunityIcons name="crown" size={12} color={color.lightText} />
                                                <Text style={[styles.vipText, { marginLeft: 2, fontWeight: '700' }]}>HOST</Text>
                                            </LinearGradient>
                                        )}
                                    </View>

                                    <Text style={[styles.userEmail, { marginBottom: Spacing.sm }]}>
                                        {user.email ?? (user.isAnonymous ? '访客账户' : '')}
                                    </Text>

                                    <View style={{
                                        backgroundColor: color.primary + '10',
                                        borderRadius: Radius.md,
                                        padding: Spacing.sm,
                                        marginBottom: Spacing.sm,
                                        borderWidth: 1,
                                        borderColor: color.primary + '20',
                                    }}>
                                        <Text style={[styles.roleText, { fontWeight: '600', color: color.primary }]}>
                                            身份: {user.profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}
                                        </Text>
                                    </View>

                                    {/* 显示游戏统计信息（如果可用） */}
                                    {user.profile && !user.isAnonymous && (user.profile as any).gamesPlayed !== undefined && (
                                        <>
                                            <View style={{
                                                backgroundColor: color.info + '10',
                                                borderRadius: Radius.md,
                                                padding: Spacing.sm,
                                                marginBottom: Spacing.xs,
                                                borderWidth: 1,
                                                borderColor: color.info + '20',
                                            }}>
                                                <Text style={[styles.roleText, { color: color.info, fontWeight: '600' }]}>
                                                    🎮 游戏 {(user.profile as any).gamesPlayed || 0} 局 ·
                                                    胜 {(user.profile as any).wins || 0} 负 {(user.profile as any).losses || 0}
                                                </Text>
                                            </View>

                                            {/* 显示总收益统计 */}
                                            <View style={{
                                                backgroundColor: (user.profile as any).totalProfit >= 0 ? color.confirm + '10' : color.error + '10',
                                                borderRadius: Radius.md,
                                                padding: Spacing.sm,
                                                marginBottom: Spacing.xs,
                                                borderWidth: 1,
                                                borderColor: (user.profile as any).totalProfit >= 0 ? color.confirm + '20' : color.error + '20',
                                            }}>
                                                <Text style={[styles.roleText, {
                                                    color: (user.profile as any).totalProfit >= 0 ? color.confirm : color.error,
                                                    fontWeight: '600'
                                                }]}>
                                                    💰 总收益: ${(user.profile as any).totalProfit || 0}
                                                </Text>
                                            </View>

                                            {/* 显示ROI统计 */}
                                            <View style={{
                                                backgroundColor: (user.profile as any).averageROI >= 0 ? color.confirm + '10' : color.error + '10',
                                                borderRadius: Radius.md,
                                                padding: Spacing.sm,
                                                borderWidth: 1,
                                                borderColor: (user.profile as any).averageROI >= 0 ? color.confirm + '20' : color.error + '20',
                                            }}>
                                                <Text style={[styles.roleText, {
                                                    color: (user.profile as any).averageROI >= 0 ? color.confirm : color.error,
                                                    fontWeight: '600'
                                                }]}>
                                                    📈 ROI: {(((user.profile as any).averageROI || 0) * 100).toFixed(1)}%
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons with Enhanced Design */}
                    <View style={styles.buttonsSection}>
                        {/* Primary Action - Start Game */}
                        <View style={{
                            backgroundColor: color.lightBackground,
                            borderRadius: Radius.lg,
                            padding: Spacing.lg,
                            marginBottom: Spacing.md,
                            shadowColor: color.shadowLight,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: color.lightGray + '50',
                        }}>
                            <LinearGradient
                                colors={[color.primary, color.highLighter]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                    borderRadius: Radius.lg,
                                    overflow: 'hidden',
                                }}
                            >
                                <TouchableOpacity
                                    onPress={() => setModalVisible(true)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: Spacing.lg,
                                        paddingHorizontal: Spacing.xl,
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons
                                        name="play-circle"
                                        size={24}
                                        color={color.lightText}
                                        style={{ marginRight: Spacing.sm }}
                                    />
                                    <Text style={{
                                        color: color.lightText,
                                        fontSize: FontSize.h3,
                                        fontWeight: '700',
                                    }}>
                                        开始新游戏
                                    </Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>

                        {/* Secondary Actions Grid */}
                        <View style={{
                            backgroundColor: color.lightBackground,
                            borderRadius: Radius.lg,
                            padding: Spacing.lg,
                            marginBottom: Spacing.md,
                            shadowColor: color.shadowLight,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: color.lightGray + '50',
                        }}>
                            <Text style={{
                                fontSize: FontSize.body,
                                fontWeight: '700',
                                color: color.title,
                                marginBottom: Spacing.md,
                                textAlign: 'center',
                            }}>
                                功能菜单
                            </Text>

                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                gap: Spacing.md, // 统一间隔
                            }}>
                                {[
                                    {
                                        key: 'profile',
                                        title: '个人资料',
                                        icon: 'account-circle',
                                        color: color.primary,
                                        onPress: () => navigation.navigate('Profile'),
                                        visible: !user?.isAnonymous,
                                    },
                                    {
                                        key: 'ranking',
                                        title: '玩家排行',
                                        icon: 'trophy',
                                        color: color.warning,
                                        onPress: () => navigation.navigate('GamePlayerRank'),
                                        visible: isHost,
                                    },
                                    {
                                        key: 'history',
                                        title: '游戏历史',
                                        icon: 'history',
                                        color: color.info,
                                        onPress: () => navigation.navigate('GameHistory'),
                                        visible: isHost,
                                    },
                                    {
                                        key: 'localHistory',
                                        title: '本地历史',
                                        icon: 'database',
                                        color: color.confirm,
                                        onPress: () => navigation.navigate('LocalHistory'),
                                        visible: true,
                                    },
                                    {
                                        key: 'settings',
                                        title: '全局设置',
                                        icon: 'cog-outline',
                                        color: color.mutedText,
                                        onPress: () => navigation.navigate('Settings'),
                                        visible: true,
                                    },
                                    {
                                        key: 'health',
                                        title: 'API Health',
                                        icon: 'cloud-check',
                                        color: color.primary,
                                        onPress: () => navigation.navigate('HealthCheck'),
                                        visible: !user?.isAnonymous,
                                    },

                                ].filter(btn => btn.visible).map((btn, index, filteredArray) => {
                                    // 计算动态宽度，考虑间隔
                                    const itemsPerRow = filteredArray.length >= 4 ? 2 : filteredArray.length <= 2 ? filteredArray.length : 3;
                                    const isLastRow = index >= filteredArray.length - (filteredArray.length % itemsPerRow || itemsPerRow);
                                    const itemWidth = itemsPerRow === 1 ? '100%' :
                                        itemsPerRow === 2 ? '47%' :
                                            '30%';

                                    return (
                                        <TouchableOpacity
                                            key={btn.key}
                                            onPress={btn.onPress}
                                            style={{
                                                width: itemWidth,
                                                backgroundColor: color.lightBackground,
                                                borderRadius: Radius.md,
                                                padding: Spacing.md,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderWidth: 1,
                                                borderColor: btn.color + '35',
                                                shadowColor: color.shadowLight,
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 4,
                                                elevation: 2,
                                                marginBottom: isLastRow ? 0 : Spacing.sm, // 最后一行不加底部间距
                                                minHeight: 65, // 减小按钮高度
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name={btn.icon as any}
                                                size={20} // 减小图标尺寸
                                                color={btn.color}
                                                style={{ marginBottom: Spacing.xs }}
                                            />
                                            <Text style={{
                                                color: btn.color,
                                                fontSize: FontSize.small - 1, // 减小字体
                                                fontWeight: '600',
                                                textAlign: 'center',
                                            }}>
                                                {btn.title}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Logout Button */}
                        <View style={{
                            backgroundColor: color.lightBackground,
                            borderRadius: Radius.lg,
                            padding: Spacing.lg,
                            shadowColor: color.shadowLight,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            elevation: 3,
                            borderWidth: 1,
                            borderColor: color.lightGray + '50',
                        }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        await signOut();
                                        useGameStore.getState().resetGame();
                                        usePlayerStore.getState().resetPlayers();
                                        clearLogs(); // 清除日志缓存
                                        Toast.show({ type: 'success', text1: '已退出登录' });
                                    } catch (e) {
                                        Toast.show({ type: 'error', text1: '退出登录失败' });
                                    }
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: Spacing.md,
                                    paddingHorizontal: Spacing.lg,
                                    borderRadius: Radius.md,
                                    backgroundColor: 'transparent',
                                    borderWidth: 1.5,
                                    borderColor: color.error + '60',
                                }}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name="logout"
                                    size={20}
                                    color={color.error}
                                    style={{ marginRight: Spacing.sm }}
                                />
                                <Text style={{
                                    color: color.error,
                                    fontSize: FontSize.body,
                                    fontWeight: '600',
                                }}>
                                    退出登录
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Game Setup Modal */}
                <Modal visible={modalVisible} transparent animationType="fade">
                    <View style={styles.overlay}>
                        <GameSetupCard
                            onConfirm={() => {
                                const { gameId } = useGameStore.getState();
                                setModalVisible(false);
                                navigation.navigate('GamePlay', { gameId });
                            }}
                            onCancel={() => setModalVisible(false)}
                        />
                    </View>
                </Modal>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footerSection}>
                <Text style={styles.footerText}>
                    版本 {appConfig.expo.version} · 轻松记录每局游戏 ✨
                </Text>
            </View>
        </>
    );
};



export default HomeScreen;