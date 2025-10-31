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
import { Palette as color } from '@/constants';
import { GameSetupCard } from '@/components/gaming/GameSetupCard';
import simpleT from '@/i18n/simpleT';
import GuestPlaceholder from '@/components/common/GuestPlaceholder';
import { useStoreReady } from '@/hooks/useStoreReady';
import { usePopup } from '@/providers/PopupProvider';
import { deleteGame } from '@/services/gameStoreDb';
import Toast from 'react-native-toast-message';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { HomePagestyles as styles } from '@/assets/styles';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import Avatar from '@/components/common/Avatar';
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

    // Subscribe to auth state and fetch profile
    useEffect(() => {
        const unsub = onAuthStateChanged(async (u: any) => {
            if (!u) {
                setUser(null);
                return;
            }

            // 如果已知用户没有 host 权限，则不去 fetchUserProfile，直接使用基础信息
            // 这样可以避免对 Firestore 的不必要请求
            if (isHost === false) {
                setUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName,
                    photoURL: u.photoURL,
                    isAnonymous: u.isAnonymous,
                    profile: undefined
                });

                // load persisted user for avatar/name preference
                try {
                    const pu = await storage.getLocal(CURRENT_USER_KEY);
                    setPersistedUser(pu);
                } catch (e) {
                    // ignore
                }

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
    }, [isHost]);

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
                <Text style={styles.loadingText}>{simpleT('loading_settings')}</Text>
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
                    <Text style={styles.title}>{simpleT('welcome_title')}</Text>
                    <Text style={styles.subtitle}>{simpleT('welcome_subtitle')}</Text>
                </LinearGradient>

                <View style={styles.mainContent}>
                    {/* User Profile Card */}
                    {user && (
                        <View style={[styles.userCard, styles.userCardExtra]}>
                            <View style={styles.userInfoContainer}>
                                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                                    <View style={styles.avatarWrapper}>
                                        <Avatar
                                            uri={user.photoURL ?? undefined}
                                            name={user.displayName ?? (user.isAnonymous ? 'guest' : 'player')}
                                            size={64}
                                            style={styles.userAvatar}
                                            imageStyle={styles.userAvatarRound}
                                            textStyle={{ color: color.lightText, fontWeight: '800', fontSize: FontSize.h2 }}
                                        />
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.userInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.userName, { flex: 1 }]}>
                                            {user.displayName ??
                                                (user.isAnonymous ? 'Guest' : 'Player')}
                                        </Text>
                                        {isHost && (
                                                <LinearGradient
                                                colors={[color.primary, color.highLighter]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[styles.vipBadge, styles.vipBadgeSmall]}
                                            >
                                                <MaterialCommunityIcons name="crown" size={12} color={color.lightText} />
                                                <Text style={[styles.vipText, { marginLeft: 2, fontWeight: '700' }]}>HOST</Text>
                                            </LinearGradient>
                                        )}
                                    </View>

                                    <Text style={[styles.userEmail, styles.userEmailMargin]}> 
                                        {user.email ?? (user.isAnonymous ? 'guest' : 'player')}
                                    </Text>

                                    <View style={styles.roleBadge}>
                                        <Text style={[styles.roleText, styles.roleTextBold, { color: color.primary }]}> 
                                            {simpleT('role_label')}: {user.profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}
                                        </Text>
                                    </View>

                                    {/* 显示游戏统计信息（如果可用） */}
                                    {user.profile && !user.isAnonymous && (user.profile as any).gamesPlayed !== undefined && (
                                        <>
                                            <View style={styles.gamesStatCard}>
                                                <Text style={[styles.roleText, styles.roleTextBold, { color: color.info }]}> 
                                                    {simpleT('games_stat', undefined, { games: (user.profile as any).gamesPlayed || 0, wins: (user.profile as any).wins || 0, losses: (user.profile as any).losses || 0 })}
                                                </Text>
                                            </View>

                                            {/* 显示总收益统计 */}
                                            <View style={[styles.profitCard, (user.profile as any).totalProfit >= 0 ? styles.profitCardPositive : styles.profitCardNegative]}>
                                                <Text style={[styles.roleText, styles.roleTextBold, { color: (user.profile as any).totalProfit >= 0 ? color.confirm : color.error }]}> 
                                                    💰 {simpleT('total_profit')}: ${(user.profile as any).totalProfit || 0}
                                                </Text>
                                            </View>

                                            {/* 显示ROI统计 */}
                                            <View style={(user.profile as any).averageROI >= 0 ? styles.roiCardPositive : styles.roiCardNegative}>
                                                <Text style={[styles.roleText, styles.roleTextBold, { color: (user.profile as any).averageROI >= 0 ? color.confirm : color.error }]}> 
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
                        <View style={styles.actionsCard}>
                            <LinearGradient
                                colors={[color.primary, color.highLighter]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.cardGradientWrapper}
                            >
                                <TouchableOpacity
                                    onPress={() => setModalVisible(true)}
                                    style={styles.startButtonTouchable}
                                    activeOpacity={0.8}
                                >
                                    <MaterialCommunityIcons
                                        name="play-circle"
                                        size={24}
                                        color={color.lightText}
                                        style={styles.logoutIcon}
                                    />
                                    <Text style={{
                                        color: color.lightText,
                                        fontSize: FontSize.h3,
                                        fontWeight: '700',
                                    }}>
                                        {simpleT('start_new_game')}
                                    </Text>
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>

                        {/* Secondary Actions Grid */}
                        <View style={styles.actionsCard}>
                            <Text style={styles.actionsTitle}>
                                {simpleT('feature_menu')}
                            </Text>

                            <View style={styles.buttonGrid}>
                                {[
                                    {
                                        key: 'profile',
                                        title: simpleT('menu_profile'),
                                        icon: 'account-circle',
                                        color: color.primary,
                                        onPress: () => navigation.navigate('Profile'),
                                        visible: !user?.isAnonymous,
                                    },
                                    {
                                        key: 'ranking',
                                        title: simpleT('menu_ranking'),
                                        icon: 'trophy',
                                        color: color.warning,
                                        onPress: () => navigation.navigate('GamePlayerRank'),
                                        visible: isHost,
                                    },
                                    {
                                        key: 'history',
                                        title: simpleT('menu_history'),
                                        icon: 'history',
                                        color: color.info,
                                        onPress: () => navigation.navigate('GameHistory', { initialTab: 'local' }),
                                        // 对所有用户可见（包括访客/匿名用户）
                                        visible: true,
                                    },
                                    {
                                        key: 'settings',
                                        title: simpleT('menu_settings'),
                                        icon: 'cog-outline',
                                        color: color.mutedText,
                                        onPress: () => navigation.navigate('Settings'),
                                        visible: true,
                                    },
                                    {
                                        key: 'health',
                                        title: simpleT('menu_health'),
                                        icon: 'cloud-check',
                                        color: color.primary,
                                        onPress: () => navigation.navigate('HealthCheck'),
                                        visible: isHost,
                                    },

                                ].filter(btn => btn.visible).map((btn, index, filteredArray) => {
                                    // 计算动态宽度，考虑间隔
                                    const itemsPerRow = filteredArray.length >= 4 ? 2 : filteredArray.length <= 2 ? filteredArray.length : 3;
                                    const isLastRow = index >= filteredArray.length - (filteredArray.length % itemsPerRow || itemsPerRow);
                                    const itemWidth = itemsPerRow === 1 ? '100%' :
                                        itemsPerRow === 2 ? '48%' :
                                            '30%';

                                    return (
                                        <TouchableOpacity
                                            key={btn.key}
                                            onPress={btn.onPress}
                                            style={[styles.gridButtonBase, { width: itemWidth, marginBottom: isLastRow ? 0 : Spacing.sm, borderColor: btn.color + '35' }]}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name={btn.icon as any}
                                                size={20}
                                                color={btn.color}
                                                style={styles.gridButtonIcon}
                                            />
                                            <Text style={[styles.gridButtonText, { color: btn.color }]}> {btn.title} </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Logout Button */}
                        <View style={styles.logoutCard}>
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        await signOut();
                                        useGameStore.getState().resetGame();
                                        usePlayerStore.getState().resetPlayers();
                                        clearLogs(); // 清除日志缓存
                                        Toast.show({ type: 'success', text1: simpleT('signout_success') });
                                    } catch (e) {
                                        Toast.show({ type: 'error', text1: simpleT('signout_failed') });
                                    }
                                }}
                                style={[styles.logoutTouchable, { borderColor: color.error + '60' }]}
                                activeOpacity={0.7}
                            >
                                <MaterialCommunityIcons
                                    name="logout"
                                    size={20}
                                    color={color.error}
                                    style={styles.logoutIcon}
                                />
                                <Text style={[styles.logoutText, { color: color.error }]}>
                                    {simpleT('signout_label')}
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
                    {simpleT('footer_version', undefined, { version: appConfig.expo.version })}
                </Text>
            </View>
        </>
    );
};



export default HomeScreen;