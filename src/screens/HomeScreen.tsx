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
import { onAuthStateChanged, signOut } from '@/services/localAuth';
import { fetchUserProfile, UserProfile } from '@/firebase/getUserProfile';
import RequireMember from '@/components/RequireMember';


type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNav>();
    const [user, setUser] = useState<{ uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null; isAnonymous?: boolean; profile?: UserProfile } | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const { finalized, gameId } = useGameStore((state) => state);
    const isReady = useStoreReady();
    const { confirmPopup } = usePopup();

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
            <ScrollView style={[styles.container,{paddingTop: 20}]}>
                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <MaterialCommunityIcons
                            name="cards-playing-outline"
                            size={64}
                            color={color.highLighter}
                            style={styles.icon}
                        />
                        <Text style={styles.title}>德州扑克筹码记录器✍️</Text>

                        {/* user card */}
                        {user && (
                            <View style={styles.userCard}>
                                <View style={styles.userInfoContainer}>
                                    <TouchableOpacity onPress={() => navigation.navigate('GamePlayerRank')}>
                                        {user.photoURL ? (
                                            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
                                        ) : (
                                            <View style={styles.userAvatar}>
                                                <Text style={{ color: color.text, fontWeight: '700' }}>{(user.displayName || '访客').slice(0, 1)}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{user.displayName ?? (user.profile?.nickname ?? (user.isAnonymous ? '访客' : '未命名'))}</Text>
                                        <Text style={styles.userEmail}>{user.email ?? (user.isAnonymous ? '访客账户' : '')}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <Text style={[styles.userEmail, { marginRight: 8 }]}>身份: {user.profile?.role ?? (user.isAnonymous ? 'guest' : 'player')}</Text>
                                            {user.profile?.role === 'member' && (
                                                <View style={{
                                                    backgroundColor: color.highLighter,
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 8,
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
                                {/* Member-only section with better visual hierarchy */}
                                {/* <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.mediumGray }}>
                                    <RequireMember fallback={
                                        <View style={{ 
                                            backgroundColor: color.lightGray, 
                                            padding: 8, 
                                            borderRadius: 6,
                                            borderLeftWidth: 3,
                                            borderLeftColor: color.weakGray
                                        }}>
                                            <Text style={{ color: color.text, fontSize: 12, fontStyle: 'italic' }}>会员专属功能已锁定</Text>
                                        </View>
                                    }>
                                        <View style={{ 
                                            backgroundColor: color.info, 
                                            padding: 8, 
                                            borderRadius: 6,
                                            borderLeftWidth: 3,
                                            borderLeftColor: color.info
                                        }}>
                                            <Text style={{ color: color.darkGray, fontWeight: '600', fontSize: 12 }}>✨ 会员专享：高级数据分析已解锁</Text>
                                        </View>
                                    </RequireMember>
                                </View> */}
                            </View>
                        )}
                    </View>

                    <View style={styles.buttonsSection}>
                        <View style={styles.actionsCard}>
                            <PrimaryButton
                                title="开始游戏"
                                icon="play-circle"
                                iconColor={color.lightText}
                                onPress={() => setModalVisible(true)}
                                style={[styles.startGameButton, { borderRadius: 10 }]}
                                size="large"
                                fullWidth={true}
                            />

                            {/* <View style={[styles.buttonRow, { marginTop: 12 }]}>
                                <PrimaryButton
                                    title="游戏历史"
                                    icon="history"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('GameHistory')}
                                    style={styles.secondaryButton}
                                    iconColor={color.info}
                                />
                                <PrimaryButton
                                    title="本地游戏历史"
                                    icon="history"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('Database')}
                                    style={styles.secondaryButton}
                                    iconColor={color.info}
                                />
                            </View> */}
                            <View style={[styles.buttonRow, { marginTop: 8 }]}>
                                <PrimaryButton
                                    title="游戏历史"
                                    icon="history"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('GameHistory')}
                                    style={[styles.secondaryButton, { width: '100%' }]}
                                    iconColor={color.info}
                                />
                            </View>


                            <View style={[styles.buttonRow, { marginTop: 8 }]}>
                                <PrimaryButton
                                    title="本地历史(测试)"
                                    icon="history"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('Database')}
                                    style={[styles.secondaryButton, { width: '100%' }]}
                                    iconColor={color.info}
                                />
                            </View>

                            <View style={[styles.buttonRow, { marginTop: 8 }]}>
                                <PrimaryButton
                                    title="玩家排行"
                                    icon="account-group"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('GamePlayerRank')}
                                    style={[styles.secondaryButton, { width: '100%' }]}
                                    iconColor={color.info}
                                />
                            </View>

                            <View style={[styles.buttonRow, { marginTop: 8 }]}>
                                <PrimaryButton
                                    title="全局设置(测试)"
                                    icon="cog-outline"
                                    variant="outlined"
                                    onPress={() => navigation.navigate('Settings')}
                                    style={[styles.secondaryButton, { width: '100%' }]}
                                    iconColor={color.info}
                                />
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
                                        navigation.navigate('Login');
                                    } catch (e) {
                                        Toast.show({ type: 'error', text1: '退出登录失败' });
                                    }
                                }}
                                style={styles.logoutButton}
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