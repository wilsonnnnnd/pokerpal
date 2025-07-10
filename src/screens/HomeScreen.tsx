import React, { useEffect, useRef, useState } from 'react';
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
import { usePlayerStore } from '@/stores/usePlayerStore';
import { HomePagestyles as styles } from '@/assets/styles';


type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNav>();
    const [modalVisible, setModalVisible] = useState(false);
    const { finalized, gameId } = useGameStore((state) => state);
    const isReady = useStoreReady();
    const { confirmPopup } = usePopup();

    useEffect(() => {
        if (!finalized) {
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
                            color={color.highLighter}
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
                                    console.log('Game ID:', useGameStore.getState());
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