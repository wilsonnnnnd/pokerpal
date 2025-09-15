

/** ========================
 * 页面：以 Firestore 为主
 * ======================== */
// cleaned GameDetailScreen.tsx using Palette tokens
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { usePopup } from '@/components/PopupProvider';
import { Palette as color } from '@/constants';
import { GameDetailstyles as styles } from '@/assets/styles';
import { handleCopyToClipboard, handleSendEmail } from '@/utils/exportHandlers';

import { doc, collection, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { GameDocFS, GameSnapshotUI, PlayerSnapshotCash } from '@/types';

const pad = (n: number) => `${n}`.padStart(2, '0');
const dateStr = (ms?: number) => (ms ? `${new Date(ms).getFullYear()}-${pad(new Date(ms).getMonth() + 1)}-${pad(new Date(ms).getDate())}` : '--');
const timeStr = (ms?: number) => (ms ? `${pad(new Date(ms).getHours())}:${pad(new Date(ms).getMinutes())}` : '--');
const fmtMoney = (n: any) => { const x = Number(n); return Number.isFinite(x) ? x.toFixed(0) : '0.00'; };

const AVATAR_COLORS = [color.card, color.warning, color.cancel, color.success, color.info, color.primary, color.strongGray];
const generateAvatarColor = (name?: string) => { const s = (name || 'U').trim(); return AVATAR_COLORS[s.charCodeAt(0) % AVATAR_COLORS.length]; };
const initialOf = (name?: string) => (typeof name === 'string' && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';

export default function GameDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { confirmPopup: showPopup } = usePopup();

    const paramGameId: string | undefined = route.params?.gameId;
    const paramGame: GameSnapshotUI | undefined = route.params?.game;

    const [loading, setLoading] = useState(!paramGame);
    const [error, setError] = useState<string | null>(null);
    const [game, setGame] = useState<GameSnapshotUI | undefined>(paramGame);

    useEffect(() => {
        if (!paramGameId) return;
        const gameRef = doc(collection(db, 'games'), paramGameId);
        const playersRef = collection(gameRef, 'test-players');

        let offGame: Unsubscribe | null = null;
        let offPlayers: Unsubscribe | null = null;
        let latestGameDoc: GameDocFS | null = null;
        let latestPlayers: any[] = [];

        const emit = () => {
            if (!latestGameDoc) return;
            const players: PlayerSnapshotCash[] = (latestPlayers || []).map((p: any) => ({
                playerId: String(p.playerId ?? p.id ?? ''),
                nickname: String(p.nickname ?? 'Unknown'),
                totalBuyInCash: Number(p.totalBuyInCash) || 0,
                settleCashAmount: Number(p.settleCashAmount) || 0,
                settleCashDiff: Number(p.settleCashDiff) || 0,
                settleROI: Number(p.settleROI) || 0,
                buyInCount: Number(p.buyInCount) || 0,
                photoUrl: p.photoUrl ?? null,
            }));

            const totals = players.reduce((acc, p) => ({
                totalBuyInCash: acc.totalBuyInCash + (Number(p.totalBuyInCash) || 0),
                totalEndingCash: acc.totalEndingCash + (Number(p.settleCashAmount) || 0),
                totalDiffCash: acc.totalDiffCash + (Number(p.settleCashDiff) || 0),
            }), { totalBuyInCash: 0, totalEndingCash: 0, totalDiffCash: 0 });

            setGame({
                id: String((latestGameDoc as any).gameId ?? paramGameId),
                smallBlind: (latestGameDoc as any).smallBlind,
                bigBlind: (latestGameDoc as any).bigBlind,
                createdMs: (latestGameDoc as any).created ? new Date((latestGameDoc as any).created).getTime() : Date.now(),
                updatedMs: (latestGameDoc as any).updated ? new Date((latestGameDoc as any).updated).getTime() : Date.now(),
                totalBuyInCash: totals.totalBuyInCash,
                totalEndingCash: totals.totalEndingCash,
                totalDiffCash: totals.totalDiffCash,
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

    const { topWinner, topLoser } = useMemo(() => {
        const players = game.players || [];
        if (!players.length) return { topWinner: null as PlayerSnapshotCash | null, topLoser: null as PlayerSnapshotCash | null };
        const desc = [...players].sort((a, b) => Number(b.settleCashDiff) - Number(a.settleCashDiff));
        const asc = [...players].sort((a, b) => Number(a.settleCashDiff) - Number(b.settleCashDiff));
        return { topWinner: desc[0], topLoser: asc[0] };
    }, [game.players]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.gameInfoHeader}>
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.dateText}>{dateStr(game.createdMs)}</Text>
                            <Text style={styles.timeText}>{timeStr(game.createdMs)}{game.updatedMs !== game.createdMs ? `（更新：${timeStr(game.updatedMs)}）` : ''}</Text>
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
                        <Text style={styles.summaryTitle}>游戏总览（现金）</Text>
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{game.players.length}</Text>
                            <Text style={styles.statLabel}>玩家数</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{fmtMoney(game.totalBuyInCash)}</Text>
                            <Text style={styles.statLabel}>总买入筹码</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{fmtMoney(game.totalEndingCash)}</Text>
                            <Text style={styles.statLabel}>总结算筹码</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: game.totalDiffCash >= 0 ? color.success : color.error }]}>
                                {game.totalDiffCash >= 0 ? '+' : '-'}{fmtMoney(Math.abs(game.totalDiffCash))}
                            </Text>
                            <Text style={styles.statLabel}>总差额</Text>
                        </View>
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
                                <View style={styles.avatar}>
                                    {topWinner.photoUrl ? (
                                        <Image source={{ uri: topWinner.photoUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: generateAvatarColor(topWinner.nickname) }]}>
                                            <Text style={styles.avatarText}>{initialOf(topWinner.nickname)}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topWinner.nickname}</Text>
                                    <Text style={styles.highlightProfit}>(+${fmtMoney(topWinner.settleCashDiff * (game.rate || 1))})</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="emoticon-sad" size={18} color={color.weakGray} />
                                <Text style={styles.highlightTitle}>最大输家</Text>
                            </View>
                            <View style={styles.highlightContent}>
                                <View style={styles.avatar}>
                                    {topLoser.photoUrl ? (
                                        <Image source={{ uri: topLoser.photoUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: generateAvatarColor(topLoser.nickname) }]}>
                                            <Text style={styles.avatarText}>{initialOf(topLoser.nickname)}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topLoser.nickname}</Text>
                                    <Text style={[styles.highlightProfit, { color: color.error }]}> (-${fmtMoney(Math.abs(topLoser.settleCashDiff * (game.rate || 1)))})</Text>
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
                            <View style={styles.playerCard} key={`${p.playerId || 'row'}-${idx}`}>
                                <View style={styles.playerCardHeader}>
                                    <View style={styles.playerIdentity}>
                                        <View style={styles.avatar}>
                                            {(p as any).photoUrl ? (
                                                <Image source={{ uri: (p as any).photoUrl }} style={styles.avatarImage} />
                                            ) : (
                                                <View style={[StyleSheet.absoluteFill, styles.avatarFallback, { backgroundColor: generateAvatarColor(p.nickname) }]}>
                                                    <Text style={styles.avatarText}>{initialOf(p.nickname)}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.playerName}>{p.nickname}</Text>
                                    </View>

                                    <View style={[styles.playerCashResult, { backgroundColor: diff >= 0 ? color.success + '22' : color.error + '22' }]}> 
                                        <MaterialCommunityIcons name={diff >= 0 ? 'cash-plus' : 'cash-minus'} size={18} color={diff >= 0 ? color.success : color.error} />
                                        <Text style={[styles.playerCashText, { color: diff >= 0 ? color.success : color.error }]}> {diff >= 0 ? '+$' : '-$'}{fmtMoney(Math.abs(diff))}</Text>
                                    </View>
                                </View>

                                <View style={styles.playerStats}>
                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="bank" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={styles.playerStatValue}>${fmtMoney(p.totalBuyInCash)}</Text>
                                            <Text style={styles.playerStatLabel}>总买入</Text>
                                        </View>
                                    </View>

                                    <View style={styles.playerStatItem}>
                                        <MaterialCommunityIcons name="cash" size={16} color={color.highLighter} />
                                        <View style={styles.playerStatTexts}>
                                            <Text style={styles.playerStatValue}>${fmtMoney(p.settleCashAmount)}</Text>
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
                                            <Text style={[styles.playerStatValue, { color: roi >= 0 ? color.success : color.error }]}>{(roi * 100).toFixed(2)}%</Text>
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
        </SafeAreaView>
    );
}
