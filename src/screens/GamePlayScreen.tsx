// src/screens/GamePlayScreen.tsx
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    View,
    FlatList,
    Text,
    TouchableOpacity,
    Modal,
    StatusBar,
    BackHandler,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Stores（全局状态）
import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useHeaderSlot } from '@/stores/useHeaderSlotStore';

// 组件
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
import { SettleSummaryModal } from '@/components/SettleSummaryModal';

// 工具/常量
import { useLogger } from '@/utils/useLogger';
import { saveGameToHistory } from '@/firebase/saveGameToHistory'; // 离线缓存（不要写远端）
import { finalizeGameOnServer, saveGameToFirebase, saveGameToLocalSql } from '@/firebase/saveGame';         // 统一远端保存入口
import { usePopup } from '@/components/PopupProvider';
import { useGameStats } from '@/hooks/useGameStats';
import { Palette as color } from '@/constants';
import { calcRate } from '@/firebase/gameWriters';                // 汇率计算

// 类型 & 样式
import { RootStackParamList } from '../../App';
import { Player } from '@/types';
import { GamePlaystyles as styles } from '@/assets/styles';
import Toast from 'react-native-toast-message';
import usePermission from '@/hooks/usePermission';


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

async function retry<T>(
    fn: () => Promise<T>,
    attempts = 3,
    baseDelayMs = 600
): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            if (i < attempts - 1) {
                const delay = baseDelayMs * Math.pow(2, i); // 600, 1200, 2400...
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}


export default function GamePlayScreen() {
    const navigation = useNavigation<HomeScreenNav>();
    const [modalState, setModalState] = useState<ModalState>(null);
    const [showSettleSummary, setShowSettleSummary] = useState(false);
    const timerRef = useRef<CallTimerHandle>(null);
    const [isLoading, setIsLoading] = useState(false);
    const submittingRef = useRef(false);
    type SubmitPhase = 'idle' | 'saving' | 'finalizing' | 'done';
    const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
    const [pendingFinalize, setPendingFinalize] = useState(false);
    // ===== Store hooks =====
    const players = usePlayerStore((state) => state.players);
    const addBuyIn = usePlayerStore((state) => state.addBuyIn);
    const setFinalChips = usePlayerStore((state) => state.setFinalChips);
    const markPlayerLeft = usePlayerStore((state) => state.markPlayerLeft);
    const markPlayerReturned = usePlayerStore((state) => state.markPlayerReturned);
    const finalized = useGameStore((state) => state.finalized);
    const { resetPlayers, updatePlayer, removePlayer } = usePlayerStore.getState();
    const { setHeaderRight, setHeaderLeft, clearHeader } = useHeaderSlot((state) => state);
    const { isHost } = usePermission();
    // ===== Utils hooks =====
    const { logs, log, clearLogs } = useLogger();
    const { confirmPopup: showPopup } = usePopup();

    // ===== 现金口径汇率（与后端一致）=====
    const rate = useMemo(() => {
        const game = useGameStore.getState();
        return calcRate(game.baseCashAmount, game.baseChipAmount);
    }, []);

    // ===== 统计（保持原 useGameStats 签名；UI 内部转换为现金口径显示）=====
    const stats = useGameStats(players);

    // ===== Header 按钮：右侧“添加玩家”，左侧“日志” =====
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

    // ===== 结束游戏前检查：必须所有在场玩家都已结算 =====
    const handleGameFinishPrompt = useCallback(async () => {
        const activePlayers = players.filter(p => p.isActive);
        const unSettled = activePlayers.filter(p => p.settleChipCount == null); // null/undefined 都算未结算
        if (unSettled.length > 0) {
            log('Game', '⚠️ 游戏结束失败，未结算玩家存在');
            showPopup({
                title: '错误',
                isWarning: true,
                message: '请先结算所有玩家的筹码',
            });
            return;
        }
        setShowSettleSummary(true); // 打开结算汇总弹窗
    }, [players]);

    const handleRetryFinalizeOnly = useCallback(async () => {
        if (submittingRef.current || isLoading) return;
        submittingRef.current = true;
        setIsLoading(true);

        try {
            const gameId = useGameStore.getState().gameId;

            setSubmitPhase('finalizing');
            if (isHost) {
                await retry(() => finalizeGameOnServer(gameId), 3, 700);
            }


            useGameStore.getState().finalizeGame();
            setPendingFinalize(false);
            setSubmitPhase('done');

            setShowSettleSummary(false);
            clearLogs();
            resetPlayers();
            navigation.navigate('Home');

            Toast.show({
                type: 'success',
                text1: '✅ 完成提交成功',
                position: 'bottom',
            });
        } catch (e: any) {
            Toast.show({
                type: 'error',
                text1: '重试失败',
                text2: e?.message || '',
                position: 'bottom',
            });
        } finally {
            setIsLoading(false);
            submittingRef.current = false;
        }
    }, []);



    // ===== 确认结束并保存（离线缓存 + 远端保存）=====
    const handleConfirmSave = useCallback(async () => {
        // ===== 防抖：硬防抖 + UI 防抖 =====
        if (submittingRef.current || isLoading) return;
        submittingRef.current = true;
        setIsLoading(true);
        try {
            // 现金口径校验
            const game = useGameStore.getState();
            const gameId = game.gameId;
            const rate = calcRate(game.baseCashAmount, game.baseChipAmount);

            const totalBuyInCash = players.reduce((sum, p) => sum + p.totalBuyInChips * rate, 0);
            const totalEndingCash = players.reduce((sum, p) => sum + (p.settleChipCount || 0) * rate, 0);
            const diffCash = totalEndingCash - totalBuyInCash;

            if (Math.abs(diffCash) > 0.01) {
                Toast.show({
                    type: 'error',
                    text1: '结算不平衡',
                    text2: `差额 = ${diffCash.toFixed(2)}（请检查结算）`,
                    position: 'bottom',
                });
                return;
            }

            // 1) 本地离线缓存（失败不继续）
            try {
                await saveGameToHistory();
            } catch (e: any) {
                Toast.show({
                    type: 'error',
                    text1: '保存失败',
                    text2: `保存到本地存储失败：${e?.message || e}`,
                });
                return;
            }

            // 2) 远端保存（明细）——带自动重试
            setSubmitPhase('saving');
            if (isHost) {
                await retry(() => saveGameToFirebase(gameId, players), 3, 700);
            }

            await saveGameToLocalSql(gameId, players);
            // 3) finalize 落库（只写 updated/status，不触碰 created）——带自动重试
            setSubmitPhase('finalizing');
            if (isHost) {
                await retry(() => finalizeGameOnServer(gameId), 3, 700);
            }


            // 4) 本地 finalize（最后一步，保证远端成功后再改本地）
            useGameStore.getState().finalizeGame();
            setPendingFinalize(false);
            setSubmitPhase('done');

            // 5) 清理与导航
            setShowSettleSummary(false);
            clearLogs();
            resetPlayers();
            navigation.navigate('Home');

            Toast.show({
                type: 'success',
                text1: '🎉 已结束并上传',
                position: 'bottom',
            });
        } catch (e: any) {
            // 区分 “已保存但 finalize 失败”的场景
            if (submitPhase === 'finalizing') {
                setPendingFinalize(true); // 进入可“补 finalize”状态
                Toast.show({
                    type: 'error',
                    text1: '已保存，但未完成提交',
                    text2: '网络波动导致完成提交失败，请点击“重试完成提交”。',
                    position: 'bottom',
                });
            } else {
                Toast.show({
                    type: 'error',
                    text1: '上传失败',
                    text2: e?.message || '',
                    position: 'bottom',
                });
            }
        } finally {
            setSubmitPhase(prev => (prev === 'done' ? 'done' : 'idle'));
            setIsLoading(false);
            submittingRef.current = false;
        }
    }, [players]);


    // ===== 返回键拦截：未结束前禁止返回 =====
    const handleBackPress = useCallback(() => {
        if (!finalized) {
            log('Game', '❌ 禁止返回，游戏未结束');
            return true; // 阻止默认返回
        }
        return false;     // 允许返回
    }, [finalized]);

    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            handleBackPress
        );

        return () => subscription.remove(); // ✅ 新写法
    }, [handleBackPress]);

    // ===== 禁止侧滑返回：仅在已结束时允许 =====
    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({ gestureEnabled: finalized });
        }, [finalized])
    );

    // ===== 长按玩家卡片的操作：编辑 or 删除 =====
    const handleLongPressPlayer = useCallback(async (player: Player) => {
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
    }, [removePlayer]);

    // ===== 计算 UI 展示用：把统计转为“现金口径”的字符串 =====
    const display = useMemo(() => {
        const toCash = (chips: number | undefined | null) =>
            ((chips || 0) * rate).toFixed(2);

        const totalDiffChips = stats?.totalDiff ?? 0;
        const totalBuyInChips = stats?.totalBuyIn ?? 0;
        const totalEndingChips = stats?.totalEnding ?? 0;

        const winner = stats?.winner;
        const loser = stats?.loser;
        const mostBuyIn = stats?.mostBuyIn;
        const leastBuyIn = stats?.leastBuyIn;
        const mostBuyInTimes = stats?.mostBuyInTimes;

        const winnerProfitChips = (winner?.settleChipCount || 0) - (winner?.totalBuyInChips || 0);
        const loserProfitChips = (loser?.settleChipCount || 0) - (loser?.totalBuyInChips || 0);

        return {
            totalDiffChips,
            totalDiffCash: toCash(totalDiffChips),
            totalBuyInChips,
            totalBuyInCash: toCash(totalBuyInChips),
            totalEndingChips,
            totalEndingCash: toCash(totalEndingChips),
            winner,
            loser,
            winnerProfitChips,
            winnerProfitCash: toCash(winnerProfitChips),
            loserProfitChips,
            loserProfitCash: toCash(loserProfitChips),
            mostBuyIn,
            leastBuyIn,
            mostBuyInTimes,
        };
    }, [stats, rate]);

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View style={styles.container}>
                {/* ===== 顶部工具按钮 ===== */}
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

                {/* ===== 玩家列表 ===== */}
                <FlatList
                    data={players}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item, index }) => (
                        <PlayerCard
                            player={item}
                            index={index}
                            onBuyIn={(p) => {
                                setModalState({ type: 'buy-in', player: p });
                                log('Player', `🪙 ${p.nickname} 追加买入`);
                            }}
                            onToggle={(p) => {
                                if (!p.isActive) {
                                    markPlayerReturned(p.id);
                                    setFinalChips(p.id, null);
                                    log('Player', `🟢 ${p.nickname} 返回游戏`);
                                } else {
                                    setModalState({ type: 'settle', player: p });
                                    log('Player', `📤 准备结算 ${p.nickname} 的筹码`);
                                }
                            }}
                            onLongPress={handleLongPressPlayer}
                            finalized={finalized}
                        />
                    )}
                    showsVerticalScrollIndicator={false}
                    extraData={finalized} // 仅依赖 finalized，避免 players 引用变化导致全量刷新
                    ListFooterComponent={
                        stats && (
                            <>
                                {/* ===== 分析卡片（展示筹码 + 现金）===== */}
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
                                        {/* 第一列：总体汇总 */}
                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="alert-decagram"
                                                text={`${display.totalDiffChips}`}
                                                label="差额"
                                                iconColor={color.highLighter}
                                                textColor={display.totalDiffChips >= 0 ? color.success : color.error}
                                            />
                                            <InfoRow
                                                icon="bank"
                                                text={`${display.totalBuyInChips} `}
                                                label="总买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="calculator-variant"
                                                text={`${display.totalEndingChips}`}
                                                label="结算总筹码"
                                                iconColor={color.highLighter}
                                            />
                                        </View>

                                        <View style={styles.analysisDivider} />

                                        {/* 第二列：赢家/输家 */}
                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="trophy-variant"
                                                text={
                                                    display.winner
                                                        ? `${display.winner.nickname} (${display.winnerProfitChips})`
                                                        : '--'
                                                }
                                                label="赢家"
                                                iconColor="#FFD700"
                                            />
                                            <InfoRow
                                                icon="emoticon-cry-outline"
                                                text={
                                                    display.loser
                                                        ? `${display.loser.nickname} (${display.loserProfitChips})`
                                                        : '--'
                                                }
                                                label="输家"
                                                iconColor="#FF6B6B"
                                            />
                                        </View>

                                        <View style={styles.analysisDivider} />

                                        {/* 第三列：买入统计 */}
                                        <View style={styles.analysisSectionContainer}>
                                            <InfoRow
                                                icon="arrow-up-bold-box"
                                                text={
                                                    display.mostBuyIn
                                                        ? `${display.mostBuyIn.nickname} (${display.mostBuyIn.totalBuyInChips})`
                                                        : '--'
                                                }
                                                label="最多买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="arrow-down-bold-box"
                                                text={
                                                    display.leastBuyIn
                                                        ? `${display.leastBuyIn.nickname} (${display.leastBuyIn.totalBuyInChips})`
                                                        : '--'
                                                }
                                                label="最少买入"
                                                iconColor={color.highLighter}
                                            />
                                            <InfoRow
                                                icon="counter"
                                                text={
                                                    display.mostBuyInTimes
                                                        ? `${display.mostBuyInTimes.nickname} (${display.mostBuyInTimes.buyInChipsList.length}次)`
                                                        : '--'
                                                }
                                                label="最多买入次数"
                                                iconColor={color.highLighter}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* 结束游戏按钮 */}
                                <PrimaryButton
                                    title={
                                        pendingFinalize
                                            ? (isLoading ? '完成提交中…' : '重试完成提交')
                                            : (isLoading
                                                ? (submitPhase === 'saving' ? '保存中…' : submitPhase === 'finalizing' ? '完成提交中…' : '提交中…')
                                                : '结束游戏')
                                    }
                                    onPress={pendingFinalize ? handleRetryFinalizeOnly : handleGameFinishPrompt}
                                    style={styles.endGameButton}
                                    textStyle={styles.endGameButtonText}
                                    icon={pendingFinalize ? 'refresh' : 'stop-circle-outline'}
                                    iconColor="#fff"
                                    iconSize={24}
                                    iconPosition="left"
                                    size="large"
                                    rounded
                                    fullWidth
                                    disabled={isLoading || finalized}
                                />

                            </>
                        )
                    }
                />

                {/* ===== 工具与弹窗 ===== */}

                {/* 决策转盘 */}
                {modalState?.type === 'wheel' && (
                    <Modal visible transparent animationType="fade" onRequestClose={() => setModalState(null)}>
                        <DecisionWheel onClose={() => setModalState(null)} />
                    </Modal>
                )}

                {/* 计时器（组件内部自带弹出） */}
                <CallTimer ref={timerRef} />

                {/* 保险计算器 */}
                {modalState?.type === 'Insurance' && (
                    <InsuranceCalculator
                        visible={modalState.type === 'Insurance'}
                        onClose={() => setModalState(null)}
                    />
                )}

                {/* 添加玩家 */}
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

                {/* 结算汇总（最后确认保存） */}
                {showSettleSummary && (
                    <SettleSummaryModal
                        players={players}
                        onConfirm={handleConfirmSave}
                        onCancel={() => setShowSettleSummary(false)}
                        isLoading={isLoading}
                    />
                )}

                {/* 追加买入弹窗 */}
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

                {/* 结算筹码弹窗 */}
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

                {/* 编辑总买入弹窗 */}
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

                {/* 日志查看器 */}
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
