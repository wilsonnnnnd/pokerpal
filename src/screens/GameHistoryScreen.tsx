// src/screens/GameHistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color, Palette } from '@/constants';
import Toast from 'react-native-toast-message';

import { GameHistorystyles as styles } from '@/assets/styles';
import { gameDoc, playerDoc } from '@/constants/namingDb';
import { fetchUserProfilesMap, resolveNameAndPhoto } from '@/firebase/fetchData';
import { GameHistoryItem, PlayerItem } from '@/types';



// ---- 导航类型 ----
type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// ---- 时区/展示工具（仅用于卡片日期显示）----
const deviceTZ = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; }
})();
const fmt = (ms: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(ms).toLocaleString(undefined, { timeZone: deviceTZ, ...opts });
const getLocalDateParts = (ms: number) => ({
    day: fmt(ms, { day: '2-digit' }),
    month: fmt(ms, { month: '2-digit' }),
    year: fmt(ms, { year: 'numeric' }),
    time: fmt(ms, { hour: '2-digit', minute: '2-digit', hour12: false }),
});
// Firestore Timestamp/ISO/Date/number -> ms
const tsToMs = (v: any, fallbackMs: number = Date.now()): number => {
    if (!v) return fallbackMs;
    if (typeof v?.toDate === 'function') return v.toDate().getTime();
    if (typeof v === 'string') {
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : fallbackMs;
    }
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    return fallbackMs;
};
// 货币格式（不带本地化符号，统一两位小数）
const money = (n: number) => Number(n).toFixed(0);

export default function GameHistoryScreen() {
    const navigation = useNavigation<HomeScreenNav>();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<GameHistoryItem[]>([]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // 1) 取游戏列表（按 created 倒序）
                const qGames = query(collection(db, gameDoc), orderBy('created', 'desc'));
                const snapshot = await getDocs(qGames);
                const gameDocs = snapshot.docs;

                // 2) 并发构建每个游戏的口径列表项
                const list: GameHistoryItem[] = await Promise.all(
                    gameDocs.map(async (docSnap) => {
                        const data = docSnap.data() ?? {};
                        const gameId = String(data.gameId ?? docSnap.id);

                        // 2.1 拉 players 子集合（以 Firestore 为主）
                        const playersSnap = await getDocs(collection(db, gameDoc, gameId, playerDoc));

                        // 2.2 批量查用户档案，减少读次数
                        const playerIds = playersSnap.docs.map(d => String(d.id)).filter(Boolean);
                        const profilesMap = await fetchUserProfilesMap(playerIds);

                        // 2.3 组装玩家（只保留字段）
                        const players: PlayerItem[] = playersSnap.docs.map(pdoc => {
                            const pdata = pdoc.data() ?? {};
                            const uid = String(pdoc.id);

                            const profileData = profilesMap.get(uid);
                            const { displayName, photoUrl } = resolveNameAndPhoto({
                                id: uid,
                                playerData: pdata,
                                profileData,
                            });

                            return {
                                id: uid,
                                nickname: displayName,
                                photoUrl,
                                buyInCount: Number(pdata.buyInCount) || 0,
                                totalBuyInCash: Number(pdata.totalBuyInCash) || 0,
                                settleCashAmount: Number(pdata.settleCashAmount) || 0,
                                settleCashDiff: Number(pdata.settleCashDiff) || 0,
                                settleROI: Number(pdata.settleROI) || 0,
                            };
                        });

                        // 2.4 汇总
                        let totalBuyInCash = 0, totalEndingCash = 0, totalDiffCash = 0;
                        for (const p of players) {
                            totalBuyInCash += p.totalBuyInCash;
                            totalEndingCash += p.settleCashAmount;
                            totalDiffCash += p.settleCashDiff;
                        }

                        // 2.5 时间归一
                        const createdMs = tsToMs(data.created);
                        const updatedMs = tsToMs(data.updated, createdMs);

                        return {
                            id: gameId,
                            smallBlind: Number(data.smallBlind ?? 0),
                            bigBlind: Number(data.bigBlind ?? 0),
                            createdMs,
                            updatedMs,
                            totalBuyInCash,
                            totalEndingCash,
                            totalDiffCash,
                            players,
                        };
                    })
                );

                // 3) 以 updatedMs 倒序（最新在前）
                list.sort((a, b) => b.updatedMs - a.updatedMs);
                setItems(list);
            } catch (e) {
                Toast.show({
                    type: 'error',
                    text1: '加载游戏历史失败',
                    text2: '请检查网络或稍后重试',
                    position: 'bottom',
                    visibilityTime: 2000,
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // —— 大赢家/大输家（按 settleCashDiff）——
    const pickTop = (game: GameHistoryItem) => {
        if (!game.players.length) return { winner: null, loser: null };
        const sorted = [...game.players].sort((a, b) => b.settleCashDiff - a.settleCashDiff);
        return { winner: sorted[0], loser: sorted[sorted.length - 1] };
    };

    // —— 渲染卡片 ——  
    const renderGameCard = ({ item }: { item: GameHistoryItem }) => {
        const { winner, loser } = pickTop(item);
        const { day, month, year, time } = getLocalDateParts(item.createdMs);

        return (
            <TouchableOpacity
                style={styles.card}
                // 只传 gameId；详情页完全以 Firestore 为主
                onPress={() => navigation.navigate('GameDetail', { game: item })}
                activeOpacity={0.7}
            >
                <View style={styles.dateContainer}>
                    <View style={styles.dateBox}>
                        <Text style={styles.dateText}>{day}</Text>
                        <Text style={styles.monthText}>{month}</Text>
                        <Text style={styles.yearText}>{year}</Text>
                    </View>
                    <Text style={styles.timeText}>{time}</Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.blindsContainer}>
                            <MaterialCommunityIcons name="poker-chip" size={20} color={color.highLighter || '#d46613'} />
                            <Text style={styles.blindsText}>{item.smallBlind}/{item.bigBlind}</Text>
                        </View>
                        <View style={styles.playerCountContainer}>
                            <Text style={styles.playerCountText}>{item.players.length}人参与</Text>
                        </View>
                    </View>

                    {/* 统计 */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="bank" size={18} color={color.highLighter || '#d46613'} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>{money(item.totalBuyInCash)}</Text>
                                <Text style={styles.statLabel}>总买入筹码</Text>
                            </View>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="calculator-variant" size={18} color={color.highLighter || '#d46613'} />
                            <View style={styles.statTexts}>
                                <Text style={styles.statValue}>{money(item.totalEndingCash)}</Text>
                                <Text style={styles.statLabel}>结算筹码</Text>
                            </View>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons
                                name={item.totalDiffCash >= 0 ? 'arrow-up-bold-circle' : 'arrow-down-bold-circle'}
                                size={18}
                                color={item.totalDiffCash >= 0 ? Palette.success : Palette.error}
                            />
                            <View style={styles.statTexts}>
                                <Text
                                    style={[
                                        styles.statValue,
                                        { color: item.totalDiffCash >= 0 ? Palette.success : Palette.error },
                                    ]}
                                >
                                    {item.totalDiffCash >= 0 ? '+' : '-'}{(Math.abs(item.totalDiffCash))}
                                </Text>
                                <Text style={styles.statLabel}>总差额</Text>
                            </View>
                        </View>
                    </View>

                    {/* 最大赢家/输家 */}
                    {winner && loser && (
                        <View style={styles.playersContainer}>
                            <View style={styles.playerRow}>
                                <View style={styles.playerInfo}>
                                    <MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
                                    <Text style={styles.playerName}>{winner.nickname}</Text>
                                </View>
                                <Text style={[styles.playerProfit, { color: Palette.success }]}>
                                    +${money(winner.settleCashDiff)}
                                </Text>
                            </View>

                            <View style={styles.playerRow}>
                                <View style={styles.playerInfo}>
                                    <MaterialCommunityIcons name="emoticon-sad" size={16} color="#9E9E9E" />
                                    <Text style={styles.playerName}>{loser.nickname}</Text>
                                </View>
                                <Text style={[styles.playerProfit, { color: Palette.error }]}>
                                    -${money(Math.abs(loser.settleCashDiff))}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.cardFooter}>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#9E9E9E" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={'#d46613'} />
                <Text style={styles.loadingText}>加载游戏历史...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={renderGameCard}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="cards" size={60} color="#BDBDBD" />
                        <Text style={styles.emptyText}>暂无游戏记录</Text>
                        <Text style={styles.emptySubText}>开始一局新游戏吧！</Text>
                    </View>
                }
            />
        </View>
    );
}
