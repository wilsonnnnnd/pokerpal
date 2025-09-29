import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { PrimaryButton } from '@/components/PrimaryButton';
import { usePopup } from '@/components/PopupProvider';
import { useSettings } from '@/providers/SettingsProvider';
import { Palette as color } from '@/constants';
import { GameDetailstyles as styles } from '@/assets/styles';
import { handleCopyToClipboard, handleSendEmail } from '@/utils/exportHandlers';

import { doc, collection, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { GameDocFS, GameSnapshotUI, PlayerSnapshotCash } from '@/types';
import { gameDoc, playerDoc } from '@/constants/namingVar';

// 辅助函数
const formatUtils = {
    pad: (n: number) => `${n}`.padStart(2, '0'),
    dateStr: (d?: string) => {
        if (!d) return '--';
        const date = new Date(d);
        return `${date.getFullYear()}-${formatUtils.pad(date.getMonth() + 1)}-${formatUtils.pad(date.getDate())}`;
    },
    timeStr: (t?: string) => {
        if (!t) return '--';
        const time = new Date(t);
        return `${formatUtils.pad(time.getHours())}:${formatUtils.pad(time.getMinutes())}`;
    },
    money: (n: any, formatCurrency?: (v: number) => string) => {
        const x = Number(n);
        if (!Number.isFinite(x)) return formatCurrency ? formatCurrency(0) : '0';
        return formatCurrency ? formatCurrency(x) : x.toFixed(0);
    }
};

const AVATAR_COLORS = [color.card, color.warning, color.cancel, color.success, color.info, color.primary, color.strongGray];
const avatarUtils = {
    generateColor: (name?: string) => {
        const s = (name || 'U').trim();
        return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length];
    },
    getInitial: (name?: string) => {
        return (typeof name === 'string' && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';
    }
};

// Avatar 组件
const Avatar = ({ photoURL, nickname, style }: { photoURL?: string | null; nickname: string; style?: any }) => (
    <View style={[styles.avatar, style]}>
        {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
        ) : (
            <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: avatarUtils.generateColor(nickname) }]}>
                <Text style={styles.avatarText}>{avatarUtils.getInitial(nickname)}</Text>
            </View>
        )}
    </View>
);

export default function GameDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { confirmPopup: showPopup } = usePopup();
    const { formatCurrency, currency } = useSettings();

    const paramGameId: string | undefined = route.params?.gameId;
    const paramGame: GameSnapshotUI | undefined = route.params?.game;

    const [loading, setLoading] = useState(!paramGame);
    const [error, setError] = useState<string | null>(null);
    const [game, setGame] = useState<GameSnapshotUI | undefined>(paramGame);

    // If navigated from a local DB snapshot, skip Firestore reads entirely
    const isLocal = Boolean(route.params?.isLocal === true && paramGame);
    useEffect(() => {
        if (isLocal && paramGame) {
            setGame(paramGame);
            setLoading(false);
            setError(null);
        }
    }, [isLocal, paramGame]);

    useEffect(() => {
        if (isLocal) return; // skip Firestore listeners when showing local snapshot
        if (!paramGameId) return;
        
        const gameRef = doc(collection(db, gameDoc), paramGameId);
        const playersRef = collection(gameRef, playerDoc);
        let offGame: Unsubscribe | null = null;
        let offPlayers: Unsubscribe | null = null;
        let latestGameDoc: GameDocFS | null = null;
        let latestPlayers: any[] = [];

        // 数据处理辅助函数
        const processPlayers = (rawPlayers: any[]): PlayerSnapshotCash[] => {
            return rawPlayers.map((p: any) => ({
                id: String(p.playerId ?? p.id ?? ''),
                nickname: String(p.nickname ?? 'Unknown'),
                totalBuyInCash: Number(p.totalBuyInCash) || 0,
                settleCashAmount: Number(p.settleCashAmount) || 0,
                settleCashDiff: Number(p.settleCashDiff) || 0,
                settleROI: Number(p.settleROI) || 0,
                buyInCount: Number(p.buyInCount) || 0,
                photoURL: p.photoURL ?? null,
                totalBuyInChips: Number(p.totalBuyInChips) || 0,
                settleChipCount: Number(p.settleChipCount) || 0,
            }));
        };

        const calculateTotals = (players: PlayerSnapshotCash[]) => {
            return players.reduce((acc, p) => ({
                totalBuyInCash: acc.totalBuyInCash + Number(p.totalBuyInCash),
                totalEndingCash: acc.totalEndingCash + Number(p.settleCashAmount),
                totalDiffCash: acc.totalDiffCash + Number(p.settleCashDiff),
                totalBuyInChips: acc.totalBuyInChips + (Number(p.totalBuyInChips) || 0),
                totalEndingChips: acc.totalEndingChips + (Number(p.settleChipCount) || 0),
            }), { totalBuyInCash: 0, totalEndingCash: 0, totalDiffCash: 0, totalBuyInChips: 0, totalEndingChips: 0 });
        };

        const calculateRate = (gameDoc: GameDocFS, totals: any) => {
            const rateFromGame = gameDoc.baseChipAmount ? 
                (Number(gameDoc.baseCashAmount || 0) / Number(gameDoc.baseChipAmount)) : 0;
            const derivedRate = totals.totalBuyInChips > 0 ? 
                (totals.totalBuyInCash / totals.totalBuyInChips) : 1;
            return (rateFromGame && Number.isFinite(rateFromGame) && rateFromGame > 0) ? 
                rateFromGame : derivedRate;
        };

        const emit = () => {
            if (!latestGameDoc) return;
            
            const players = processPlayers(latestPlayers);
            const totals = calculateTotals(players);
            const rate = calculateRate(latestGameDoc, totals);

            setGame({
                id: String(latestGameDoc.gameId ?? paramGameId),
                smallBlind: latestGameDoc.smallBlind,
                bigBlind: latestGameDoc.bigBlind,
                created: latestGameDoc.created ?? new Date().toISOString(),
                updated: latestGameDoc.updated ?? new Date().toISOString(),
                baseCashAmount: Number(latestGameDoc.baseCashAmount) || 0,
                baseChipAmount: Number(latestGameDoc.baseChipAmount) || 0,
                finalized: Boolean(latestGameDoc.finalized),
                token: latestGameDoc.token || null,
                ...totals,
                rate,
                players,
            });
            setLoading(false);
            setError(null);
        };

        offGame = onSnapshot(
            gameRef,
            snap => {
                if (!snap.exists()) {
                    setError('游戏不存在或已被删除');
                    setLoading(false);
                    return;
                }
                latestGameDoc = { ...(snap.data() as GameDocFS) };
                (latestGameDoc as any).gameId = latestGameDoc?.gameId ?? snap.id;
                emit();
            },
            err => {
                setError(err?.message || '读取游戏失败');
                setLoading(false);
            }
        );

        offPlayers = onSnapshot(
            query(playersRef, orderBy('playerId', 'asc')),
            snap => {
                latestPlayers = snap.docs.map(d => ({ __docId: d.id, ...d.data() }));
                emit();
            },
            err => {
                setError(err?.message || '读取玩家列表失败');
            }
        );

        return () => { offGame && offGame(); offPlayers && offPlayers(); };
    }, [paramGameId]);

    if (loading) return (
        <View style={[styles.notFoundContainer, { justifyContent: 'center' }]}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, color: color.loadingText }}>正在加载游戏数据…</Text>
        </View>
    );

    if (error) return (
        <View style={styles.notFoundContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={60} color={color.error} />
            <Text style={styles.notFound}>{error}</Text>
            <PrimaryButton title="返回" icon="arrow-left" onPress={() => navigation.goBack()} style={styles.backButton} textStyle={styles.backButtonText} />
        </View>
    );

    if (!game) return (
        <View style={styles.notFoundContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={60} color={color.weakGray} />
            <Text style={styles.notFound}>未找到该游戏记录</Text>
            <PrimaryButton title="返回" icon="arrow-left" onPress={() => navigation.goBack()} style={styles.backButton} textStyle={styles.backButtonText} />
        </View>
    );

    const { topWinner, topLoser, exchangeRate } = useMemo(() => {
        const players = game.players || [];
        if (!players.length) return { 
            topWinner: null as PlayerSnapshotCash | null, 
            topLoser: null as PlayerSnapshotCash | null, 
            exchangeRate: 1 
        };
        
        const sortedByProfit = [...players].sort((a, b) => Number(b.settleCashDiff) - Number(a.settleCashDiff));
        const rate = (() => {
            const baseCash = Number(game.baseCashAmount ?? 0);
            const baseChip = Number(game.baseChipAmount ?? 0);
            if (!baseChip || !Number.isFinite(baseCash) || !Number.isFinite(baseChip)) return 1;
            const r = baseCash / baseChip;
            return Number.isFinite(r) && r > 0 ? r : 1;
        })();
        return {
            topWinner: sortedByProfit[0],
            topLoser: sortedByProfit[sortedByProfit.length - 1],
            exchangeRate: rate
        };
    }, [game.players, game.baseCashAmount, game.baseChipAmount]);

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.gameInfoHeader}>
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.dateText}>{formatUtils.dateStr(game.created)}</Text>
                            <Text style={styles.timeText}>
                                {formatUtils.timeStr(game.created)}
                                {game.updated !== game.created ? `（更新：${formatUtils.timeStr(game.updated)}）` : ''}
                            </Text>
                        </View>
                        <View style={styles.blindContainer}>
                            <MaterialCommunityIcons name="poker-chip" size={18} color={color.lightText} />
                            <Text style={styles.blindText}>{game.smallBlind ?? '-'} / {game.bigBlind ?? '-'}</Text>
                        </View>
                    </View>
                    <Text style={styles.gameIdText}>ID: {game.id.slice(0, 12)}...</Text>
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <MaterialCommunityIcons name="chart-box" size={20} color={color.highLighter} />
                        <Text style={styles.summaryTitle}>游戏总览</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{game.players.length}</Text>
                            <Text style={styles.statLabel}>玩家数</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: game.totalDiffCash >= 0 ? color.success : color.error }]}>
                                {game.totalDiffCash >= 0 ? '+' : '-'}{formatUtils.money(Math.abs(game.totalDiffCash), formatCurrency)}
                            </Text>
                            <Text style={styles.statLabel}>总差额</Text>
                        </View>
                    </View>

                    {/* 第二行：初始设定 */}
                    <View style={[styles.statsGrid, { marginTop: 12 }]}>
                        <View style={[styles.statBox, { backgroundColor: color.info + '10', borderColor: color.info + '20', borderWidth: 1 }]}>
                            <Text style={[styles.statValue, { color: color.info }]}>{formatUtils.money(game.baseCashAmount || 0, formatCurrency)}</Text>
                            <Text style={[styles.statLabel, { color: color.info }]}>初始买入金额</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: color.warning + '10', borderColor: color.warning + '20', borderWidth: 1 }]}>
                            <Text style={[styles.statValue, { color: color.warning }]}>{formatUtils.money(game.baseChipAmount || 0)}</Text>
                            <Text style={[styles.statLabel, { color: color.warning }]}>初始买入筹码</Text>
                        </View>
                    </View>

                    {/* 兑换比率信息 */}
                    <View style={{ 
                        marginTop: 12,
                        borderRadius: 8,
                        backgroundColor: color.primary + '08',
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                    }}>
                        <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginBottom: 6 
                        }}>
                            <MaterialCommunityIcons 
                                name="swap-horizontal" 
                                size={14} 
                                color={color.primary}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={{ 
                                fontSize: 12, 
                                fontWeight: '600',
                                color: color.primary,
                            }}>
                                兑换比率
                            </Text>
                        </View>
                        
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 4
                        }}>
                            <View style={{
                                backgroundColor: color.warning + '10',
                                borderRadius: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                marginRight: 6
                            }}>
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '600',
                                    color: color.warning
                                }}>
                                    1筹码
                                </Text>
                            </View>
                            
                            <MaterialCommunityIcons 
                                name="equal" 
                                size={12} 
                                color={color.mutedText}
                                style={{ marginHorizontal: 3 }}
                            />
                            
                            <View style={{
                                backgroundColor: color.success + '10',
                                borderRadius: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                marginLeft: 6
                            }}>
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '600',
                                    color: color.success
                                }}>
                                    {formatCurrency(exchangeRate)}
                                </Text>
                            </View>
                        </View>
                        
                        <Text style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: color.title,
                            textAlign: 'center',
                            marginBottom: 2
                        }}>
                            1 : {exchangeRate.toFixed(2)} {currency}
                        </Text>
                        <Text style={{
                            fontSize: 9,
                            color: color.mutedText,
                            textAlign: 'center',
                            fontWeight: '500'
                        }}>
                            基于初始设定计算
                        </Text>
                    </View>
                </View>

                {topWinner && topLoser && (
                    <View style={styles.highlightsContainer}>
                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="trophy" size={18} color={color.card} />
                                <Text style={styles.highlightTitle}>最大赢家</Text>
                            </View>
                            <View style={styles.highlightContent}>
                                <Avatar photoURL={topWinner.photoURL} nickname={topWinner.nickname} />
                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topWinner.nickname}</Text>
                                    <Text style={styles.highlightProfit}>(+{formatUtils.money(topWinner.settleCashDiff * (game.rate || 1), formatCurrency)})</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="emoticon-sad" size={18} color={color.weakGray} />
                                <Text style={styles.highlightTitle}>最大输家</Text>
                            </View>
                            <View style={styles.highlightContent}>
                                <Avatar photoURL={topLoser.photoURL} nickname={topLoser.nickname} />
                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topLoser.nickname}</Text>
                                    <Text style={[styles.highlightProfit, { color: color.error }]}>
                                        (-{formatUtils.money(Math.abs(topLoser.settleCashDiff * (game.rate || 1)), formatCurrency)})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="account-group" size={20} color={color.highLighter} />
                    <Text style={styles.sectionTitle}>玩家列表</Text>
                </View>

                <View style={styles.playerListContainer}>
                    {game.players.map((p, idx) => {
                        const diff = Number(p.settleCashDiff) || 0;
                        const roi = Number(p.settleROI) || 0;
                        return (
                            <View style={styles.playerCard} key={`${p.id || 'row'}-${idx}`}>
                                <View style={styles.playerCardHeader}>
                                    <View style={styles.playerIdentity}>
                                        <Avatar photoURL={(p as any).photoUrl} nickname={p.nickname} />
                                        <Text style={styles.playerName}>{p.nickname}</Text>
                                    </View>

                                    <View style={[styles.playerCashResult, { backgroundColor: diff >= 0 ? color.success + '22' : color.error + '22' }]}> 
                                        <MaterialCommunityIcons name={diff >= 0 ? 'cash-plus' : 'cash-minus'} size={18} color={diff >= 0 ? color.success : color.error} />
                                        <Text style={[styles.playerCashText, { color: diff >= 0 ? color.success : color.error }]}>
                                            {diff >= 0 ? '+' : '-'}{formatUtils.money(Math.abs(diff), formatCurrency)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.playerStats}>
                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="bank" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={styles.playerStatValue}>{formatUtils.money(p.totalBuyInCash, formatCurrency)}</Text>
                                            <Text style={styles.playerStatLabel}>总买入</Text>
                                        </View>
                                    </View>

                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="cash" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={styles.playerStatValue}>{formatUtils.money(p.settleCashAmount, formatCurrency)}</Text>
                                            <Text style={styles.playerStatLabel}>结算金额</Text>
                                        </View>
                                    </View>

                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="repeat" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={styles.playerStatValue}>{p.buyInCount}次</Text>
                                            <Text style={styles.playerStatLabel}>买入次数</Text>
                                        </View>
                                    </View>

                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="chart-line" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={[styles.playerStatValue, { color: roi >= 0 ? color.success : color.error }]}>
                                                {(roi * 100).toFixed(2)}%
                                            </Text>
                                            <Text style={styles.playerStatLabel}>ROI</Text>
                                        </View>
                                    </View>
                                </View>


                            </View>
                        );
                    })}
                </View>

                <View style={styles.actionButtons}>
                    <PrimaryButton title="复制战绩" icon="content-copy" onPress={() => handleCopyToClipboard(game, () => { }, showPopup)} style={styles.copyButton} textStyle={styles.actionButtonText} />
                    <PrimaryButton title="发送邮件" icon="email" onPress={() => handleSendEmail(() => { }, showPopup)} style={styles.emailButton} textStyle={styles.actionButtonText} />
                </View>
            </ScrollView>
        </View>
    );
}
