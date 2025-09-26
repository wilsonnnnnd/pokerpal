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
import { LinearGradient } from 'expo-linear-gradient';

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
                        <View style={styles.userCard}>
                            <View style={styles.userInfoContainer}>
                                <TouchableOpacity onPress={() => navigation.navigate('GamePlayerRank')}>
                                    {(persistedUser?.photoURL ?? user.photoURL) ? (
                                        <Image 
                                            source={{ uri: (persistedUser?.photoURL ?? user.photoURL) }} 
                                            style={styles.userAvatar} 
                                        />
                                    ) : (
                                        <View style={styles.userAvatar}>
                                            <Text style={{ 
                                                color: color.text, 
                                                fontWeight: '700', 
                                                fontSize: FontSize.h2 
                                            }}>
                                                {((persistedUser?.displayName ?? user.displayName) || '访客').slice(0, 1)}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.userInfo}>
                                    <Text style={styles.userName}>
                                        {(persistedUser?.displayName ?? user.displayName) ?? 
                                         (user.profile?.nickname ?? (user.isAnonymous ? '访客' : '未命名'))}
                                    </Text>
                                    <Text style={styles.userEmail}>
                                        {persistedUser?.email ?? user.email ?? (user.isAnonymous ? '访客账户' : '')}
                                    </Text>
                                    <View style={styles.userRole}>
                                        <Text style={styles.roleText}>
                                            身份: {user.profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}
                                        </Text>
                                        {isHost && (
                                            <View style={styles.vipBadge}>
                                                <MaterialCommunityIcons name="crown" size={12} color={color.lightText} />
                                                <Text style={styles.vipText}>VIP</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonsSection}>
                        <View style={styles.actionsCard}>
                            <PrimaryButton
                                title="开始新游戏"
                                icon="play-circle"
                                iconColor={color.lightText}
                                onPress={() => setModalVisible(true)}
                                style={styles.startGameButton}
                                size="large"
                                fullWidth={true}
                            />

                            <View style={styles.buttonGrid}>
                                {[
                                    {
                                        key: 'history',
                                        title: '游戏历史',
                                        icon: 'history',
                                        onPress: () => navigation.navigate('GameHistory'),
                                        visible: isHost,
                                    },
                                    {
                                        key: 'localHistory',
                                        title: '本地历史',
                                        icon: 'database',
                                        onPress: () => navigation.navigate('Database'),
                                        visible: true,
                                    },
                                    {
                                        key: 'ranking',
                                        title: '玩家排行',
                                        icon: 'trophy',
                                        onPress: () => navigation.navigate('GamePlayerRank'),
                                        visible: isHost,
                                    },
                                    {
                                        key: 'settings',
                                        title: '全局设置',
                                        icon: 'cog-outline',
                                        onPress: () => navigation.navigate('Settings'),
                                        visible: true,
                                    },
                                ].filter(btn => btn.visible).map((btn) => (
                                    <PrimaryButton
                                        key={btn.key}
                                        title={btn.title}
                                        icon={btn.icon as any}
                                        variant="outlined"
                                        onPress={btn.onPress}
                                        style={styles.gridButton}
                                        iconColor={color.info}
                                    />
                                ))}
                            </View>

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
                                    } catch (e) {
                                        Toast.show({ type: 'error', text1: '退出登录失败' });
                                    }
                                }}
                                style={styles.logoutButton}
                                iconColor={color.error}
                            />
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
                    版本 1.0.0 · 轻松记录每局游戏 ✨
                </Text>
            </View>
        </>
    );
};



export default HomeScreen;