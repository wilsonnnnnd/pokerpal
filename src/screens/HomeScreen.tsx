import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ActivityIndicator,
    ScrollView,
    ImageBackground,
    StatusBar,
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
import { deleteGameFromFirebase } from '@/firebase/deleteGameFromFirebase';
import Toast from 'react-native-toast-message';

type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNav>();
    const [modalVisible, setModalVisible] = useState(false);
    const { status, gameId } = useGameStore((state) => state);
    const isReady = useStoreReady();
    const { confirmPopup  } = usePopup();

    useEffect(() => {
        if (status === 'ongoing') {
            const confirmation = async () => {
                try {
                    const result = await confirmPopup({
                        title: '继续上次游戏？',
                        message: '检测到您有未完成的游戏，是否继续？',
                    });
    
                    if (result) {
                        navigation.navigate('GamePlay', { gameId });

                    } else {
                        await deleteGameFromFirebase(gameId);
                        useGameStore.getState().resetGame(); 


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
            <ScrollView style={styles.container}>
                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <MaterialCommunityIcons
                            name="cards-playing-outline"
                            size={64}
                            color={color.iconHighlighter}
                            style={styles.icon}
                        />
                        <Text style={styles.title}>德州扑克筹码记录器</Text>
                        <Text style={styles.subtitle}>为荷官设计，专注每一局记录 ✍️</Text>
                    </View>

                    <View style={styles.buttonsSection}>
                        <PrimaryButton
                            title="开始游戏"
                            icon="play-circle"
                            iconColor="#fff"
                            onPress={() => setModalVisible(true)}
                            style={styles.startGameButton}
                            size="large"
                            fullWidth={true}
                        />

                        <View style={styles.buttonRow}>
                            <PrimaryButton
                                title="游戏历史"
                                icon="history"
                                variant="outlined"
                                onPress={() => navigation.navigate('GameHistory')}
                                style={styles.secondaryButton}
                                iconColor="#3498db"
                            />

                            <PrimaryButton
                                title="玩家排行"
                                icon="account-group"
                                variant="outlined"
                                onPress={() => navigation.navigate('GamePlayerRank')}
                                style={styles.secondaryButton}
                                iconColor="#3498db"
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#7f8c8d',
    },
    headerSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    buttonsSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
    },
    footerSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
        bottom: 20,
        position: 'absolute',
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 32,
        textAlign: 'center',
    },
    startGameButton: {
        marginBottom: 24,
        backgroundColor: '#27ae60',
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    secondaryButton: {
        width: '48%',
        borderColor: '#3498db',
    },

    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    footerText: {
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'center',
    },
});

export default HomeScreen;