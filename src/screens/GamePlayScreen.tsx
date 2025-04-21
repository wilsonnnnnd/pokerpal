import React, { useCallback, useState } from 'react';
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Image,
    StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { GradientCard } from '@/components/GradientCard';
import { AddPlayerCard } from '@/components/AddPlayerCard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHeaderSlot } from '@/stores/useHeaderSlotStore';
import { Palette as color } from '@/constants';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useLogger } from '@/utils/useLogger';
import { LogViewer } from '@/components/LogViewer';
import { BuyInPopupCard } from '@/components/BuyInPopupCard';
import { SettleChipPopupCard } from '@/components/SettleChipPopupCard';
import { InfoRow } from '@/components/InfoRow';
import { Player } from '@/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { saveGameToHistory } from '@/utils/saveGameToHistory';
import { saveGameToFirebase } from '@/firebase/saveGameToFirebase';
import { usePopup } from '@/components/PopupProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { EditBuyInPopupCard } from '@/components/EditBuyInPopupCard';
import { PlayerCard } from '@/components/PlayerCard';
import { useGameStats } from '@/hooks/useGameStats';

type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function GamePlayScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
    const players = usePlayerStore((state) => state.players);
    const addBuyIn = usePlayerStore((state) => state.addBuyIn);
    const setFinalChips = usePlayerStore((state) => state.setFinalChips);
    const markPlayerLeft = usePlayerStore((state) => state.markPlayerLeft);
    const markPlayerReturned = usePlayerStore((state) => state.markPlayerReturned);
    const finalized = useGameStore((state) => state.finalized);
    const { resetPlayers, updatePlayer, removePlayer } = usePlayerStore.getState();
    const { setHeaderRight, setHeaderLeft, clearHeader } = useHeaderSlot((state) => state);
    const { logs, log, clearLogs } = useLogger();
    const { confirmPopup: showPopup } = usePopup();
    const stats = useGameStats(players);
    
    const gameId = useGameStore((state) => state.gameId);

    type ModalState =
        | { type: 'add-player' }
        | { type: 'log-viewer' }
        | { type: 'buy-in'; player: Player }
        | { type: 'settle'; player: Player }
        | { type: 'edit'; player: Player }
        | null;

    const [modalState, setModalState] = useState<ModalState>(null);

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

    useFocusEffect(
        useCallback(() => {
            setHeaderRight(
                <TouchableOpacity onPress={() => setModalState({ type: 'add-player' })}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons name="plus-circle" size={28} color={color.iconHighlighter} />
                </TouchableOpacity>
            );
            setHeaderLeft(
                <TouchableOpacity onPress={() => setModalState({ type: 'log-viewer' })}
                    style={styles.headerButton}
                >
                    <MaterialCommunityIcons name="history" size={28} color={color.iconHighlighter} />
                </TouchableOpacity>
            );
            return () => clearHeader();
        }, [])
    );

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
            // Fixed: Add option to settle chips when player is active
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
            // Handle edit player
            setModalState({ type: 'edit', player });
            log('Player', `✏️ 编辑玩家 ${player.nickname}`);
        } else if (action === false) {
            // Handle delete player
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
            <View style={styles.container}>
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
                                            color={color.iconHighlighter}
                                        />
                                        <Text style={styles.analysisTitle}>游戏分析</Text>
                                    </LinearGradient>

                                    <View style={styles.analysisCardContainer}>
                                        <InfoRow
                                            icon="alert-decagram"
                                            text={`${stats.totalDiff}`}
                                            label="差额"
                                            iconColor={color.iconHighlighter}
                                            textColor={stats.totalDiff >= 0 ? color.success : color.error}
                                        />
                                        <InfoRow
                                            icon="bank"
                                            text={`${stats.totalBuyIn}`}
                                            label="总买入"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="calculator-variant"
                                            text={`${stats.totalEnding}`}
                                            label="结算总筹码"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="trophy-variant"
                                            text={`${stats.winner.nickname} (${((stats.winner.settleChipCount || 0) - stats.winner.totalBuyInChips)})`}
                                            label="赢家"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="emoticon-cry-outline"
                                            text={`${stats.loser.nickname} (${((stats.loser.settleChipCount || 0) - stats.loser.totalBuyInChips)})`}
                                            label="输家"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="arrow-up-bold-box"
                                            text={`${stats.mostBuyIn.nickname} (${stats.mostBuyIn.totalBuyInChips})`}
                                            label="最多买入"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="arrow-down-bold-box"
                                            text={`${stats.leastBuyIn.nickname} (${stats.leastBuyIn.totalBuyInChips})`}
                                            label="最少买入"
                                            iconColor={color.iconHighlighter}
                                        />
                                        <InfoRow
                                            icon="counter"
                                            text={`${stats.mostBuyInTimes.nickname} (${stats.mostBuyInTimes.buyInChipsList.length}次)`}
                                            label="最多买入次数"
                                            iconColor={color.iconHighlighter}
                                        />
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

                {modalState?.type === 'add-player' && (
                    <Modal transparent animationType="fade">
                        <View style={styles.overlay}>
                            <AddPlayerCard onConfirm={() => setModalState(null)} onCancel={() => setModalState(null)} />
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
                                    // Create updated player with new total buy-in
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f6fa',
    },
    list: {
        gap: 16,
        paddingBottom: 24,
    },
    card: {
        padding: 0,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    avatarAndName: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    nameContainer: {
        marginLeft: 12,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2c3e50',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    profitText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 2,
    },
    detailsContainer: {
        padding: 16,
        backgroundColor: '#fff',
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 10,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    detailTexts: {
        marginLeft: 8,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    detailLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eaeaea',
        backgroundColor: '#f8f9fa',
    },
    buyinButton: {
        flex: 1,
        marginRight: 8,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        height: 42,
    },
    buyinText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    leaveButton: {
        flex: 1,
        marginLeft: 8,
        backgroundColor: '#F44336',
        borderRadius: 12,
        height: 42,
    },
    returnButton: {
        backgroundColor: '#2196F3',
    },
    leaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    disabledButton: {
        opacity: 0.5,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 20,
    },
    analysisCard: {
        borderRadius: 16,
        backgroundColor: '#fff',
        marginTop: 24,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    analysisTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#2c3e50',
    },
    analysisCardContainer: {
        padding: 16,
    },
    endGameButton: {
        backgroundColor: '#FF9800',
        borderRadius: 12,
        marginBottom: 24,
        height: 50,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3,
    },
    endGameButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerButton: {
        padding: 4,
    }
});