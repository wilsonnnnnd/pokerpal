// src/screens/GameDetailScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { usePopup } from '@/components/PopupProvider';
import { Palette as color, Palette } from '@/constants';
import { GameDetailstyles as styles } from '@/assets/styles';
import { handleCopyToClipboard, handleSendEmail } from '@/utils/exportHandlers';

// ===== Firestore =====
import {
    doc,
    collection,
    onSnapshot,
    getDocs,
    query,
    orderBy,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { calcRate } from '@/firebase/gameWriters';
import { GameDocFS, GameSnapshotUI, PlayerSnapshotCash } from '@/types';



/** ========================
 * 工具函数：时间/汇总/归一化
 * ======================== */
// Timestamp/毫秒/Date -> 毫秒数
const tsToMs = (t: any): number => {
    if (!t) return Date.now();
    if (typeof t === 'number') return t;
    if (t.seconds != null && t.nanoseconds != null) {
        return t.seconds * 1000 + Math.floor(t.nanoseconds / 1e6);
    }
    const d = new Date(t);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : Date.now();
};

// 汇总
const computeTotals = (players: PlayerSnapshotCash[]) => {
    let totalBuyInCash = 0;
    let totalEndingCash = 0;
    let totalDiffCash = 0;
    for (const p of players) {
        totalBuyInCash += Number(p.totalBuyInCash) || 0;
        totalEndingCash += Number(p.settleCashAmount) || 0;
        totalDiffCash += Number(p.settleCashDiff) || 0;
    }
    return { totalBuyInCash, totalEndingCash, totalDiffCash };
};

// 归一化
const normalizeGame = (gameDoc: GameDocFS, playersDocs: any[], docId: string): GameSnapshotUI => {
    const players: PlayerSnapshotCash[] = (playersDocs || []).map((p: any) => ({
        playerId: String(p.playerId ?? p.id ?? ''),
        nickname: String(p.nickname ?? 'Unknown'),
        totalBuyInCash: Number(p.totalBuyInCash) || 0,
        settleCashAmount: Number(p.settleCashAmount) || 0,
        settleCashDiff: Number(p.settleCashDiff) || 0,
        settleROI: Number(p.settleROI) || 0,
        buyInCount: Number(p.buyInCount) || 0,
        photoUrl: p.photoUrl ?? null,
    }));
    const totals = computeTotals(players);
    return {
        id: String(gameDoc.gameId || docId),
        smallBlind: gameDoc.smallBlind,
        bigBlind: gameDoc.bigBlind,
        createdMs: tsToMs(gameDoc.created),
        updatedMs: tsToMs(gameDoc.updated),
        totalBuyInCash: totals.totalBuyInCash,
        totalEndingCash: totals.totalEndingCash,
        totalDiffCash: totals.totalDiffCash,
        players,
    };
};

/** ========================
 * 仅用于展示的小工具
 * ======================== */
const pad = (n: number) => `${n}`.padStart(2, '0');
const dateStr = (ms?: number) => {
    if (!ms) return '--';
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const timeStr = (ms?: number) => {
    if (!ms) return '--';
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtMoney = (n: any) => {
    const x = Number(n);
    return Number.isFinite(x) ? x.toFixed(0) : '0.00';
};
const avatarBg = (name?: string) => {
    const cs = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];
    const s = (name || 'U').trim();
    return cs[s.charCodeAt(0) % cs.length];
};
const initialOf = (name?: string) =>
    typeof name === 'string' && name.trim() ? name.trim().charAt(0).toUpperCase() : 'U';

/** ========================
 * 页面：以 Firestore 为主
 * ======================== */
export default function GameDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { confirmPopup: showPopup } = usePopup();

    // 路由参数支持两种：gameId（推荐）或（备选）完整对象
    const paramGameId: string | undefined = route.params?.gameId;
    const paramGame: GameSnapshotUI | undefined = route.params?.game;

    const [loading, setLoading] = useState(!paramGame); // 若已传 game 对象则直接显示
    const [error, setError] = useState<string | null>(null);
    const [game, setGame] = useState<GameSnapshotUI | undefined>(paramGame);

    useEffect(() => {
        // 若已传完整对象且不想监听，可直接返回
        if (!paramGameId) return;

        const gameRef = doc(collection(db, 'games'), paramGameId);
        const playersRef = collection(gameRef, 'test-players'); // —— 以你的截图为准的子集合名

        let offGame: Unsubscribe | null = null;
        let offPlayers: Unsubscribe | null = null;

        // 本地缓存 players 以组合
        let latestGameDoc: GameDocFS | null = null;
        let latestPlayers: any[] = [];

        const emit = () => {
            if (!latestGameDoc) return;
            const ui = normalizeGame(latestGameDoc, latestPlayers, paramGameId);
            setGame(ui);
            setLoading(false);
            setError(null);
        };

        // 监听 game 文档
        offGame = onSnapshot(
            gameRef,
            snap => {
                if (!snap.exists()) {
                    setError('游戏不存在或已被删除');
                    setLoading(false);
                    return;
                }
                latestGameDoc = { ...(snap.data() as GameDocFS) };
                // Firestore 文档里常见字段是 gameId；若缺失就用 doc.id
                (latestGameDoc as any).gameId = latestGameDoc?.gameId ?? snap.id;
                emit();
            },
            err => {
                setError(err?.message || '读取游戏失败');
                setLoading(false);
            }
        );

        // 监听子集合 players（按 playerId 排序仅为稳定显示）
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

        return () => {
            offGame && offGame();
            offPlayers && offPlayers();
        };
    }, [paramGameId]);

    // ====== Loading / Error / Not found ======
    if (loading) {
        return (
            <View style={[styles.notFoundContainer, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 12, color: '#7f8c8d' }}>正在加载游戏数据…</Text>
            </View>
        );
    }
    if (error) {
        return (
            <View style={styles.notFoundContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#e74c3c" />
                <Text style={styles.notFound}>{error}</Text>
                <PrimaryButton
                    title="返回"
                    icon="arrow-left"
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    textStyle={styles.backButtonText}
                />
            </View>
        );
    }
    // ✅ 生成随机头像颜色（做空值保护）
    const generateAvatarColor = (name?: string) => {
        const colors = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];
        const n = (name || 'U');
        return colors[n.charCodeAt(0) % colors.length];
    };

    // ✅ 提取首字母（做空值与非字符串保护）
    const initialOf = (name?: string) => (typeof name === 'string' && name.trim()) ? name.trim().charAt(0).toUpperCase() : 'U';
    if (!game) {
        return (
            <View style={styles.notFoundContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#bdc3c7" />
                <Text style={styles.notFound}>未找到该游戏记录</Text>
                <PrimaryButton
                    title="返回"
                    icon="arrow-left"
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    textStyle={styles.backButtonText}
                />
            </View>
        );
    }

    // ====== 最大赢家/输家（按现金差额） ======
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
                {/* 头部 */}
                <View style={styles.header}>
                    <View style={styles.gameInfoHeader}>
                        <View style={styles.dateTimeContainer}>
                            <Text style={styles.dateText}>{dateStr(game.createdMs)}</Text>
                            <Text style={styles.timeText}>
                                {timeStr(game.createdMs)}
                                {game.updatedMs !== game.createdMs ? `（更新：${timeStr(game.updatedMs)}）` : ''}
                            </Text>
                        </View>

                        <View style={styles.blindContainer}>
                            <MaterialCommunityIcons name="poker-chip" size={18} color="#FFFFFF" />
                            <Text style={styles.blindText}>
                                {game.smallBlind ?? '-'} / {game.bigBlind ?? '-'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.gameIdText}>ID: {game.id.slice(0, 12)}...</Text>
                </View>

                {/* 总览（现金） */}
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
                            <Text
                                style={[
                                    styles.statValue,
                                    { color: game.totalDiffCash >= 0 ? '#4CAF50' : '#F44336' },
                                ]}
                            >
                                {game.totalDiffCash >= 0 ? '+' : '-'}{fmtMoney(Math.abs(game.totalDiffCash))}
                            </Text>
                            <Text style={styles.statLabel}>总差额</Text>
                        </View>
                    </View>
                </View>

                {/* 高光 */}
                {topWinner && topLoser && (
                    <View style={styles.highlightsContainer}>
                        {/* 最大赢家 */}
                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="trophy" size={18} color="#FFD700" />
                                <Text style={styles.highlightTitle}>最大赢家</Text>
                            </View>
                            <View style={styles.highlightContent}>
                                <View style={styles.avatar}>
                                    {topWinner.photoUrl ? (
                                        // ✅ 如果有头像链接
                                        <Image
                                            source={{ uri: topWinner.photoUrl }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        // ✅ 没有头像，用颜色+首字母
                                        <View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                styles.avatarFallback,
                                                { backgroundColor: generateAvatarColor(topWinner.nickname) },
                                            ]}
                                        >
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

                        {/* 最大输家 */}
                        <View style={styles.highlightCard}>
                            <View style={styles.highlightHeader}>
                                <MaterialCommunityIcons name="emoticon-sad" size={18} color="#9E9E9E" />
                                <Text style={styles.highlightTitle}>最大输家</Text>
                            </View>
                            <View style={styles.highlightContent}>
                                <View style={styles.avatar}>
                                    {topLoser.photoUrl ? (
                                        // ✅ 如果有头像链接
                                        <Image
                                            source={{ uri: topLoser.photoUrl }}
                                            style={styles.avatarImage}
                                        />
                                    ) : (
                                        // ✅ 没有头像，用颜色+首字母
                                        <View
                                            style={[
                                                StyleSheet.absoluteFill,
                                                styles.avatarFallback,
                                                { backgroundColor: generateAvatarColor(topLoser.nickname) },
                                            ]}
                                        >
                                            <Text style={styles.avatarText}>{initialOf(topLoser.nickname)}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.highlightInfo}>
                                    <Text style={styles.highlightName}>{topLoser.nickname}</Text>
                                    <Text style={[styles.highlightProfit, { color: Palette.error }]}>
                                        (-${fmtMoney(Math.abs(topLoser.settleCashDiff * (game.rate || 1)))})
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* 玩家列表 */}
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
                                                <View
                                                    style={[
                                                        StyleSheet.absoluteFill,
                                                        styles.avatarFallback,
                                                        { backgroundColor: generateAvatarColor(p.nickname) },
                                                    ]}
                                                >
                                                    <Text style={styles.avatarText}>{initialOf(p.nickname)}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.playerName}>{p.nickname}</Text>
                                    </View>

                                    <View style={[styles.playerCashResult, { backgroundColor: diff >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                                        <MaterialCommunityIcons
                                            name={diff >= 0 ? 'cash-plus' : 'cash-minus'}
                                            size={18}
                                            color={diff >= 0 ? Palette.success : Palette.error}
                                        />
                                        <Text style={[styles.playerCashText, { color: diff >= 0 ? Palette.success : Palette.error }]}>
                                            {diff >= 0 ? '+$' : '-$'}{fmtMoney(Math.abs(diff))}
                                        </Text>
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
                                            <Text style={[styles.playerStatValue, { color: roi >= 0 ? Palette.success : Palette.error }]}>
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

                {/* 操作区（沿用你原来的导出/邮件） */}
                <View style={styles.actionButtons}>
                    <PrimaryButton
                        title="复制战绩"
                        icon="content-copy"
                        onPress={() => handleCopyToClipboard(game, () => { }, showPopup)}
                        style={styles.copyButton}
                        textStyle={styles.actionButtonText}
                    />
                    <PrimaryButton
                        title="发送邮件"
                        icon="email"
                        onPress={() => handleSendEmail(() => { }, showPopup)}
                        style={styles.emailButton}
                        textStyle={styles.actionButtonText}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
