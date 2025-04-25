import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    FlatList,
    Text,
    TouchableOpacity,
    Modal,
    StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Stores
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useHeaderSlot } from '@/stores/useHeaderSlotStore';

// Components
import { PrimaryButton } from '@/components/PrimaryButton';
import { InfoRow } from '@/components/InfoRow';
import { PlayerCard } from '@/components/PlayerCard';
import { AddPlayerCard } from '@/components/AddPlayerCard';
import { BuyInPopupCard } from '@/components/BuyInPopupCard';
import { SettleChipPopupCard } from '@/components/SettleChipPopupCard';
import { EditBuyInPopupCard } from '@/components/EditBuyInPopupCard';
import { LogViewer } from '@/components/LogViewer';
import CallTimer, { CallTimerHandle } from '@/components/CallTimer';
import InsuranceCalculator from '@/components/InsuranceCalculator';
import DecisionWheel from '@/components/DecisionWheel';

// Utils
import { useLogger } from '@/utils/useLogger';
import { saveGameToHistory } from '@/utils/saveGameToHistory';
import { saveGameToFirebase } from '@/firebase/saveGameToFirebase';
import { usePopup } from '@/components/PopupProvider';
import { useGameStats } from '@/hooks/useGameStats';
import { Palette as color } from '@/constants';

// Types
import { RootStackParamList } from '../../App';
import { Player } from '@/types';

// Styles
import { GamePlaystyles as styles } from '@/assets/styles';

type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type ModalState =
    | { type: 'add-player' }
    | { type: 'log-viewer' }
    | { type: 'buy-in'; player: Player }
    | { type: 'settle'; player: Player }
    | { type: 'edit'; player: Player }
    | { type: 'wheel' }
    | { type: 'Insurance' }

    | null;

export default function GamePlayScreen() {
    const navigation = useNavigation<HomeScreenNav>();
    const [modalState, setModalState] = useState<ModalState>(null);

    // Refs
    const timerRef = useRef<CallTimerHandle>(null);

    // Store hooks
    const players = usePlayerStore((state) => state.players);
    const addBuyIn = usePlayerStore((state) => state.addBuyIn);
    const setFinalChips = usePlayerStore((state) => state.setFinalChips);
    const markPlayerLeft = usePlayerStore((state) => state.markPlayerLeft);
    const markPlayerReturned = usePlayerStore((state) => state.markPlayerReturned);
    const finalized = useGameStore((state) => state.finalized);
    const { resetPlayers, updatePlayer, removePlayer } = usePlayerStore.getState();
    const { setHeaderRight, setHeaderLeft, clearHeader } = useHeaderSlot((state) => state);

    // Utils hooks
    const { logs, log, clearLogs } = useLogger();
    const { confirmPopup: showPopup } = usePopup();
    const stats = useGameStats(players);

    // Active players count for display
    const activePlayers = players.filter(p => p.isActive).length;
    const totalPlayers = players.length;

    // Header setup
    useFocusEffect(
        useCallback(() => {
            setHeaderRight(
                <TouchableOpacity
                    onPress={() => setModalState({ type: 'add-player' })}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons name="plus-circle" size={28} color={color.highLighter} />
                </TouchableOpacity>
            );
            setHeaderLeft(
                <TouchableOpacity
                    onPress={() => setModalState({ type: 'log-viewer' })}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons name="history" size={28} color={color.highLighter} />
                </TouchableOpacity>
            );
            return () => clearHeader();
        }, [])
    );

    // Game finish handler
    const handleGameFinishPrompt = async () => {
        const activePlayers = players.filter(p => p.isActive);
        const unSettled = activePlayers.filter(p => p.settleChipCount === undefined);
        if (unSettled.length > 0) {
            log('Game', '⚠️ 游戏结束失败，未结算玩家存在');
            showPopup({
                title: '错误',
                isWarning: true,
                message: '请先结算所有玩家的筹码',
            });
            return;
        }

        const totalBuyIn = players.reduce((sum, p) => sum + p.totalBuyInChips, 0);
        const totalEnding = players.reduce((sum, p) => sum + (p.settleChipCount || 0), 0);
        const diff = totalEnding - totalBuyIn;
        const gameId = useGameStore.getState().gameId;

        const confirmed = await showPopup({
            title: '结束游戏',
            message: '确定要结束游戏并保存记录吗？',
            isWarning: true,
        });

        if (await confirmed) {
            saveGameToHistory();
            await saveGameToFirebase(gameId, players);
            useGameStore.getState().finalizeGame();
            log('Game', `🏁 游戏结束，总差额 ${diff}`);
            clearLogs();
            resetPlayers();
            navigation.navigate('Home');
        }
    };

    // Player action handlers
    const handleBuyIn = (player: Player) => {
        setModalState({ type: 'buy-in', player });
        log('Player', `🪙 ${player.nickname} 追加买入`);
    };

    const handleTogglePlayer = (player: Player) => {
        if (!player.isActive) {
            markPlayerReturned(player.id);
            setFinalChips(player.id, null);
            log('Player', `🟢 ${player.nickname} 返回游戏`);
        } else {
            setModalState({ type: 'settle', player });
            log('Player', `📤 准备结算 ${player.nickname} 的筹码`);
        }
    };

    const handleLongPressPlayer = async (player: Player) => {
        const action = await showPopup({
            title: '编辑玩家总买入操作',
            message: `请选择对 ${player.nickname} 的操作`,
            isWarning: false,
        });

        if (action === true) {
            setModalState({ type: 'edit', player });
            log('Player', `✏️ 编辑玩家 ${player.nickname}`);
        } else if (action === false) {
            const confirmDelete = await showPopup({
                title: '删除玩家',
                message: `确定要删除 ${player.nickname} 吗？`,
                isWarning: true,
            });

            if (confirmDelete) {
                removePlayer(player.id);
                log('Player', `🗑️ 删除玩家 ${player.nickname}`);
            }
        }
    };

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View style={styles.container}>
                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.toolButton}
                        onPress={() => timerRef.current?.show()}
                    >
                        <MaterialCommunityIcons name="timer-outline" size={22} color="#fff" />
                        <Text style={styles.toolButtonText}>计时器</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.toolButton}
                        onPress={() => setModalState({ type: 'Insurance' })}
                    >
                        <MaterialCommunityIcons name="calculator" size={22} color="#fff" />
                        <Text style={styles.toolButtonText}>保险计算</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.toolButton}
                        onPress={() => setModalState({ type: 'wheel' })}
                    >
                        <MaterialCommunityIcons name="rotate-3d-variant" size={22} color="#fff" />
                        <Text style={styles.toolButtonText}>决策转盘</Text>
                    </TouchableOpacity>
                </View>

                {/* Player List */}
                <FlatList
                    data={players}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item, index }) => (
                        <PlayerCard
                            player={item}
                            index={index}
                            onBuyIn={handleBuyIn}
                            onToggle={handleTogglePlayer}
                            onLongPress={handleLongPressPlayer}
                            finalized={finalized}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    extraData={[players, finalized]}
                    ListFooterComponent={
                        stats && (
                            <>
                                <View style={styles.analysisCard}>
                                    <LinearGradient
                                        colors={['#f5f7fa', '#e4e7eb']}
                                        style={styles.analysisHeader}
                                    >
                                        <MaterialCommunityIcons
                                            name="chart-box"
                                            size={28}
                                            color={color.highLighter}
                                        />
                                        <Text style={styles.analysisTitle}>游戏分析</Text>
                                    </LinearGradient>

                                    <View style={styles.analysisCardContainer}>
                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="alert-decagram"
                                                text={`${stats.totalDiff}`}
                                                label="差额"
                                                iconColor={color.highLighter}
                                                textColor={stats.totalDiff >= 0 ? color.success : color.error}
                                            />
                                            <InfoRow
                                                icon="bank"
                                                text={`${stats.totalBuyIn}`}
                                                label="总买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="calculator-variant"
                                                text={`${stats.totalEnding}`}
                                                label="结算总筹码"
                                                iconColor={color.highLighter}
                                            />
                                        </View>

                                        <View style={styles.analysisDivider} />

                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="trophy-variant"
                                                text={`${stats.winner.nickname} (${((stats.winner.settleChipCount || 0) - stats.winner.totalBuyInChips)})`}
                                                label="赢家"
                                                iconColor="#FFD700"
                                            />
                                            <InfoRow
                                                icon="emoticon-cry-outline"
                                                text={`${stats.loser.nickname} (${((stats.loser.settleChipCount || 0) - stats.loser.totalBuyInChips)})`}
                                                label="输家"
                                                iconColor="#FF6B6B"
                                            />
                                        </View>

                                        <View style={styles.analysisDivider} />

                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="arrow-up-bold-box"
                                                text={`${stats.mostBuyIn.nickname} (${stats.mostBuyIn.totalBuyInChips})`}
                                                label="最多买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="arrow-down-bold-box"
                                                text={`${stats.leastBuyIn.nickname} (${stats.leastBuyIn.totalBuyInChips})`}
                                                label="最少买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="counter"
                                                text={`${stats.mostBuyInTimes.nickname} (${stats.mostBuyInTimes.buyInChipsList.length}次)`}
                                                label="最多买入次数"
                                                iconColor={color.highLighter}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <PrimaryButton
                                    title="结束游戏"
                                    onPress={handleGameFinishPrompt}
                                    style={styles.endGameButton}
                                    textStyle={styles.endGameButtonText}
                                    icon="stop-circle-outline"
                                    iconColor="#fff"
                                    iconSize={24}
                                    iconPosition="left"
                                    size="large"
                                    rounded={true}
                                    fullWidth={true}
                                />
                            </>
                        )
                    }
                />

                {/* Tools & Modals */}
                {modalState?.type === 'wheel' && (
                    <Modal visible transparent animationType="fade" onRequestClose={() => setModalState(null)}>
                        <DecisionWheel onClose={() => setModalState(null)} />
                    </Modal>
                )}

                <CallTimer
                    ref={timerRef}
                />

                {modalState?.type === 'Insurance' && (
                    <InsuranceCalculator
                        visible={modalState.type === 'Insurance'}
                        onClose={() => setModalState(null)}
                    />
                )}


                {/* Modal state handling */}
                {modalState?.type === 'add-player' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <AddPlayerCard
                                onConfirm={() => setModalState(null)}
                                onCancel={() => setModalState(null)}
                            />
                        </View>
                    </Modal>
                )}

                {modalState?.type === 'buy-in' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <BuyInPopupCard
                                player={modalState.player}
                                onSubmit={(amount) => {
                                    addBuyIn(modalState.player.id, amount);
                                    log('Player', `🪙 ${modalState.player.nickname} 追加买入 ${amount} 筹码`);
                                    setModalState(null);
                                }}
                                onCancel={() => setModalState(null)}
                            />
                        </View>
                    </Modal>
                )}

                {modalState?.type === 'settle' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <SettleChipPopupCard
                                player={modalState.player}
                                onConfirm={(chipCount) => {
                                    setFinalChips(modalState.player.id, chipCount);
                                    markPlayerLeft(modalState.player.id);
                                    log('Player', `📤 ${modalState.player.nickname} 离场，结算筹码 ${chipCount}`);
                                    setModalState(null);
                                }}
                                onCancel={() => setModalState(null)}
                            />
                        </View>
                    </Modal>
                )}

                {modalState?.type === 'edit' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <EditBuyInPopupCard
                                player={modalState.player}
                                onConfirm={(buyInAmount) => {
                                    const updatedPlayer = {
                                        ...modalState.player,
                                        totalBuyInChips: buyInAmount
                                    };
                                    updatePlayer(modalState.player.id, updatedPlayer);
                                    log('Player', `✏️ 编辑玩家 ${updatedPlayer.nickname} 总买入修改为 ${buyInAmount}`);
                                    setModalState(null);
                                }}
                                onCancel={() => setModalState(null)}
                            />
                        </View>
                    </Modal>
                )}

                {modalState?.type === 'log-viewer' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <LogViewer logs={logs} onClose={() => setModalState(null)} />
                        </View>
                    </Modal>
                )}
            </View>
        </>
    );
}