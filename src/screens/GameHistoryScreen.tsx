// src/screens/GameHistoryScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    limit,
    startAfter,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebase/config';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color, Palette } from '@/constants';
import Toast from 'react-native-toast-message';

import { GameHistorystyles as styles } from '@/assets/styles';
import { CURRENT_USER_KEY, gameDoc, hostGameDoc, playerDoc } from '@/constants/namingVar';
import { fetchUserProfilesMap, resolveNameAndPhoto } from '@/firebase/fetchData';
import { GameHistoryItem, PlayerItem } from '@/types';
import storage from '@/services/storageService';
import usePermission from '@/hooks/usePermission';
import RequireHost from '@/components/RequireHost';
import { PrimaryButton } from '@/components/PrimaryButton';

// ---- 导航类型 ----
type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// ---- 工具：简易金额格式化 ----
const money = (n: number) => Number(n).toFixed(0);

// ---- 每页条数 ----
const PAGE_SIZE = 20;

// 说明：当前真实路径示例：/test-host-games/Guest/test-games/game-xxxx
//       - hostGameDoc === 'test-host-games'
//       - gameDoc     === 'test-games'（既用作主集合名，也作为 host 子集合名）

export default function GameHistoryScreen() {
    const navigation = useNavigation<HomeScreenNav>();
    const { isHost, loading: permLoading } = usePermission();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<GameHistoryItem[]>([]);

    // 分页
    const nextCursorRef = useRef<QueryDocumentSnapshot | null>(null);
    const reachedEndRef = useRef<boolean>(false);

    // 防重复拉取同一 gameId
    const fetchedSetRef = useRef<Set<string>>(new Set());

    // 获取当前 hoster（沿用 displayName）
    const getHosterId = useCallback(async (): Promise<string | null> => {
        const pu = await storage.getLocal(CURRENT_USER_KEY);
        const hoster = pu?.displayName;
        return hoster;
    }, []);

    // —— 构建单条 GameHistoryItem（从主集合 /test-games/{gameId} + /players 聚合）——
    const buildGameHistoryItem = useCallback(async (gameId: string): Promise<GameHistoryItem | null> => {
        try {
            // 主文档：/test-games/{gameId}
            const gameRef = doc(db, gameDoc, gameId);
            const gameSnap = await getDoc(gameRef);
            if (!gameSnap.exists()) {
                // 主集合被清理或不存在，跳过
                return null;
            }
            const data = gameSnap.data() ?? {};

            // 玩家子集合：/test-games/{gameId}/players
            const playersColRef = collection(db, gameDoc, gameId, playerDoc);
            const playersSnap = await getDocs(playersColRef);

            // 批量查用户档案
            const playerIds = playersSnap.docs.map((d) => String(d.id)).filter(Boolean);
            const profilesMap = await fetchUserProfilesMap(playerIds);

            // 组装玩家
            const players: PlayerItem[] = playersSnap.docs.map((pdoc) => {
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

            // 汇总
            let totalBuyInCash = 0, totalEndingCash = 0, totalDiffCash = 0;
            for (const p of players) {
                totalBuyInCash += p.totalBuyInCash;
                totalEndingCash += p.settleCashAmount;
                totalDiffCash += p.settleCashDiff;
            }

            // 时间字段兜底：优先 created/updatedAt（Timestamp），退化到 created/updated（字符串）
            const created = data.created?.toDate
                ? data.created.toDate().toISOString()
                : (data.created || new Date().toISOString());
            const updated = data.updatedAt?.toDate
                ? data.updatedAt.toDate().toISOString()
                : (data.updated || created);

            return {
                id: gameId,
                smallBlind: Number(data.smallBlind ?? 0),
                bigBlind: Number(data.bigBlind ?? 0),
                created,
                updated,
                totalBuyInCash,
                totalEndingCash,
                totalDiffCash,
                players,
            };
        } catch {
            return null;
        }
    }, []);

    // —— 分页读取 host 的游戏列表 —— 
    // 路径：/test-host-games/{hoster}/test-games  按 created desc
    const fetchPage = useCallback(
        async (mode: 'refresh' | 'append' | 'initial') => {
            const hoster = await getHosterId();
            if (!hoster) {
                setItems([]);
                reachedEndRef.current = true;
                nextCursorRef.current = null;
                return;
            }

            // 子集合：/hostGameDoc/{hoster}/{gameDoc}
            const baseCol = collection(doc(db, hostGameDoc, hoster), gameDoc);

            const q = nextCursorRef.current
                ? query(baseCol, orderBy('created', 'desc'), startAfter(nextCursorRef.current), limit(PAGE_SIZE))
                : query(baseCol, orderBy('created', 'desc'), limit(PAGE_SIZE));

            const snap = await getDocs(q);
            const docs = snap.docs;

            if (docs.length === 0) {
                if (mode !== 'refresh') reachedEndRef.current = true;
                return;
            }

            // 取出 gameId（子文档 id），去重后再拉详情
            const ids = docs.map(d => d.id).filter(id => {
                if (fetchedSetRef.current.has(id)) return false;
                fetchedSetRef.current.add(id);
                return true;
            });

            const detailList = await Promise.all(ids.map((gid) => buildGameHistoryItem(gid)));
            const built = (detailList.filter(Boolean) as GameHistoryItem[])
                // 二次兜底排序，避免 serverTimestamp 初期为空导致抖动
                .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

            if (mode === 'refresh' || mode === 'initial') {
                setItems(built);
            } else {
                setItems((prev) => [...prev, ...built]);
            }

            // 更新游标
            nextCursorRef.current = docs.length === PAGE_SIZE ? docs[docs.length - 1] : null;
            if (!nextCursorRef.current) {
                reachedEndRef.current = true;
            }
        },
        [buildGameHistoryItem, getHosterId]
    );

    // // —— 首屏加载 ——
    // useEffect(() => {
    //     // 权限检查：非 host 用户直接返回首页
    //     if (!permLoading && isHost === false) {
    //         navigation.navigate('Home');
    //         return;
    //     }

    //     (async () => {
    //         try {
    //             setLoading(true);
    //             // 重置分页状态
    //             reachedEndRef.current = false;
    //             nextCursorRef.current = null;
    //             fetchedSetRef.current.clear();
    //             await fetchPage('initial');
    //         } catch (e) {
    //             Toast.show({
    //                 type: 'error',
    //                 text1: '加载游戏历史失败',
    //                 text2: '请检查网络或稍后重试',
    //                 position: 'bottom',
    //                 visibilityTime: 2000,
    //             });
    //         } finally {
    //             setLoading(false);
    //         }
    //     })();
    // }, [fetchPage]);

    // —— 下拉刷新 ——
    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            reachedEndRef.current = false;
            nextCursorRef.current = null;
            fetchedSetRef.current.clear();
            await fetchPage('refresh');
        } finally {
            setRefreshing(false);
        }
    }, [fetchPage]);

    // —— 触底加载更多 ——
    const onEndReached = useCallback(async () => {
        if (loading || refreshing) return;
        if (reachedEndRef.current) return;
        try {
            await fetchPage('append');
        } catch {
            // 忽略
        }
    }, [fetchPage, loading, refreshing]);

    // —— 赢家/输家 ——  
    const pickTop = (game: GameHistoryItem) => {
        if (!game.players.length) return { winner: null, loser: null };
        const sorted = [...game.players].sort((a, b) => b.settleCashDiff - a.settleCashDiff);
        return { winner: sorted[0], loser: sorted[sorted.length - 1] };
    };

    // —— 渲染卡片 ——  
    const renderGameCard = ({ item }: { item: GameHistoryItem }) => {
        const { winner, loser } = pickTop(item);
        const { day, month, year, time } = (() => {
            if (!item.created) return { day: '--', month: '--', year: '--', time: '--:--' };
            const d = new Date(item.created);
            return {
                day: String(d.getDate()).padStart(2, '0'),
                month: String(d.getMonth() + 1).padStart(2, '0'),
                year: String(d.getFullYear()),
                time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
            };
        })();

        return (
            <TouchableOpacity
                style={styles.card}
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

    // 整页受限于 Host 权限
    return (
        <RequireHost
            loadingFallback={(
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={'#d46613'} />
                    <Text style={styles.loadingText}>正在检查权限...</Text>
                </View>
            )}
            denyFallback={(
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="lock" size={60} color="#BDBDBD" />
                    <Text style={styles.emptyText}>无权限查看此页面</Text>
                    <Text style={styles.emptySubText}>此功能仅对房主开放</Text>
                    <View style={{ marginTop: 12 }}>
                        <PrimaryButton title="返回首页" onPress={() => navigation.navigate('Home')} />
                    </View>
                </View>
            )}
        >
            <View style={styles.container}>
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={renderGameCard}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    ListFooterComponent={
                        !reachedEndRef.current ? (
                            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={'#d46613'} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="cards" size={60} color="#BDBDBD" />
                            <Text style={styles.emptyText}>暂无游戏记录</Text>
                            <Text style={styles.emptySubText}>开始一局新游戏吧！</Text>
                        </View>
                    }
                />
            </View>
        </RequireHost>
    );
}
