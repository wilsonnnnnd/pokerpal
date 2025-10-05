// src/screens/GameHistoryScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';

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
    where,
    documentId,
} from 'firebase/firestore';
import { db } from '@/firebase/config';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color, Palette } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import Toast from 'react-native-toast-message';

import { GameHistorystyles as styles } from '@/assets/styles';
import { gameDoc, hostGameDoc, playerDoc } from '@/constants/namingVar';
import { fetchUserProfilesMap, resolveNameAndPhoto } from '@/firebase/fetchData';
import { GameHistoryItem, PlayerItem } from '@/types';
import usePermission from '@/hooks/usePermission';
import { RequireHost } from '@/hooks/RequireHost';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GameCard } from '@/components/GameCard';
import { getHosterId } from '@/utils/hostInfo';
import { usePaginatedPageState } from '@/hooks/usePageState';
import { PageStateView } from '@/components/PageState';

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
    
    // 使用统一的分页状态管理
    const pageState = usePaginatedPageState();
    const [items, setItems] = useState<GameHistoryItem[]>([]);

    // 分页相关refs
    const nextCursorRef = useRef<QueryDocumentSnapshot | null>(null);
    const reachedEndRef = useRef<boolean>(false);
    const fetchedSetRef = useRef<Set<string>>(new Set());


    // 批量读取主集合 /games/{gameId}（只针对 top-level gameDoc 路径），
    // 使用 documentId() in 查询，Firestore 对 in 的限制是最多 10 个 id，所以需要分片。
    const fetchMainGamesByIds = async (ids: string[]) => {
        const map = new Map<string, any>();
        if (!ids.length) return map;

        const chunkSize = 10; // Firestore "in" 最大为 10
        for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            const q = query(collection(db, gameDoc), where(documentId(), 'in', chunk));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                map.set(d.id, d.data());
            }
        }

        return map;
    };


    // —— 构建单条 GameHistoryItem（从主集合 /test-games/{gameId} + /players 聚合）——
    const buildGameHistoryItem = useCallback(async (gameId: string, owner?: string, preFetchedMainData?: any, indexAgg?: any): Promise<GameHistoryItem | null> => {
        try {
            // 优先使用预加载的主文档数据（如果有），减少单次网络请求
            let data: any = preFetchedMainData ?? null;
            let usedMainPath = false;

            if (!data) {
                // 尝试主文档：/games/{gameId}
                const mainSnap = await getDoc(doc(db, gameDoc, gameId));
                if (mainSnap.exists()) {
                    data = mainSnap.data() ?? {};
                    usedMainPath = true;
                }
            } else {
                usedMainPath = true;
            }

            if (!data && owner) {
                // 兼容 owner-scoped 路径：/games/{owner}/game/{gameId}
                const altSnap = await getDoc(doc(db, gameDoc, owner, 'game', gameId));
                if (altSnap.exists()) {
                    data = altSnap.data() ?? {};
                    usedMainPath = false;
                }
            }

            if (!data) {
                // 主集合或备选位置都不存在，跳过
                return null;
            }

            let players: PlayerItem[] | undefined = undefined;
            let totalBuyInCash = 0, totalEndingCash = 0, totalDiffCash = 0;

            // 如果索引文档提供了聚合数据，优先使用，避免读取 players 子集合
            if (indexAgg && (indexAgg.totalBuyInCash !== undefined || indexAgg.playerCount !== undefined)) {
                totalBuyInCash = Number(indexAgg.totalBuyInCash) || 0;
                totalEndingCash = Number(indexAgg.totalEndingCash) || 0;
                totalDiffCash = Number(indexAgg.totalDiffCash) || 0;

                // players 可能未加载，保留 playerCount
            } else {
                // 玩家子集合路径选择：如果主路径存在则使用 /games/{gameId}/players，否则使用 owner-scoped 路径
                let playersColRef = usedMainPath
                    ? collection(db, gameDoc, gameId, playerDoc)
                    : collection(db, gameDoc, owner || '', 'game', gameId, playerDoc);

                const playersSnap = await getDocs(playersColRef);

                // 批量查用户档案
                const playerIds = playersSnap.docs.map((d) => String(d.id)).filter(Boolean);
                const profilesMap = await fetchUserProfilesMap(playerIds);

                // 组装玩家
                players = playersSnap.docs.map((pdoc) => {
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
                        photoURL: photoUrl,
                        buyInCount: Number(pdata.buyInCount) || 0,
                        totalBuyInCash: Number(pdata.totalBuyInCash) || 0,
                        settleCashAmount: Number(pdata.settleCashAmount) || 0,
                        settleCashDiff: Number(pdata.settleCashDiff) || 0,
                        settleROI: Number(pdata.settleROI) || 0,
                    };
                });

                // 汇总
                for (const p of players) {
                    totalBuyInCash += p.totalBuyInCash;
                    totalEndingCash += p.settleCashAmount;
                    totalDiffCash += p.settleCashDiff;
                }
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
                baseChipAmount: data.baseChipAmount !== undefined ? Number(data.baseChipAmount) : undefined,
                baseCashAmount: data.baseCashAmount !== undefined ? Number(data.baseCashAmount) : undefined,
                finalized: Boolean(data.finalized === true),
                token: data.token !== undefined ? String(data.token) : null,
                totalBuyInCash,
                totalEndingCash,
                totalDiffCash,
                players,
                playerCount: indexAgg?.playerCount ?? (players ? players.length : undefined),
            };
        } catch (e) {
            // log error but don't break the whole list
            // eslint-disable-next-line no-console
            console.error('[GameHistory] buildGameHistoryItem error for', gameId, e);
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
            // 打印查询结果的文档 id（对应 hostGameDoc/{hoster}/{gameDoc} 下的子文档 id）
            const docIds = docs.map(d => d.id);

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

            
            // 批量预取主集合中存在的 game 文档，减少单独的 getDoc 请求
            const mainMap = await fetchMainGamesByIds(ids);

            // 从 host 索引的 docs 中也可以直接读取聚合字段，优先使用索引文档的聚合数据来避免大量 players 子集合读取
            const indexAggMap = new Map<string, any>();
            for (const d of docs) {
                // 索引文档本身可能就包含聚合字段：totalBuyInCash/totalEndingCash/totalDiffCash/playerCount/smallBlind/bigBlind/created/updated
                indexAggMap.set(d.id, d.data());
            }

            const detailList = await Promise.all(
                ids.map((gid) => buildGameHistoryItem(gid, hoster, mainMap.get(gid), indexAggMap.get(gid)))
            );
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

    // —— 首屏加载 ——
    useEffect(() => {
        // 权限检查：非 host 用户直接返回首页
        if (!permLoading && isHost === false) {
            navigation.navigate('Home');
            return;
        }

        (async () => {
            try {
                pageState.setLoading(true);
                // 重置分页状态
                reachedEndRef.current = false;
                nextCursorRef.current = null;
                fetchedSetRef.current.clear();
                await fetchPage('initial');
            } catch (e) {
                pageState.setError('加载游戏历史失败，请检查网络或稍后重试');
                Toast.show({
                    type: 'error',
                    text1: '加载游戏历史失败',
                    text2: '请检查网络或稍后重试',
                    position: 'bottom',
                    visibilityTime: 2000,
                });
            } finally {
                pageState.setLoading(false);
            }
        })();
    }, [fetchPage, permLoading, isHost, navigation, pageState]);

    // —— 下拉刷新 ——
    const onRefresh = useCallback(async () => {
        try {
            pageState.setRefreshing(true);
            pageState.setError(null);
            reachedEndRef.current = false;
            nextCursorRef.current = null;
            fetchedSetRef.current.clear();
            await fetchPage('refresh');
        } finally {
            pageState.setRefreshing(false);
        }
    }, [fetchPage, pageState]);

    // —— 触底加载更多 ——
    const onEndReached = useCallback(async () => {
        if (pageState.loading || pageState.refreshing) return;
        if (reachedEndRef.current) return;
        try {
            pageState.setIsLoadingMore(true);
            await fetchPage('append');
        } catch {
            // 忽略
        } finally {
            pageState.setIsLoadingMore(false);
        }
    }, [fetchPage, pageState]);

    // —— 赢家/输家 ——  
    const pickTop = (game: GameHistoryItem) => {
        const players = game.players ?? [];
        if (players.length === 0) return { winner: null, loser: null };
        const sorted = [...players].sort((a, b) => b.settleCashDiff - a.settleCashDiff);
        return { winner: sorted[0], loser: sorted[sorted.length - 1] };
    };

    // —— 渲染卡片 ——  
    const renderGameCard = ({ item, index }: { item: GameHistoryItem; index: number }) => (
        <GameCard 
            item={item} 
            index={index}
            onPress={(game) => navigation.navigate('GameDetail', { game })}
        />
    );

    // 处理重试
    const handleRetry = useCallback(() => {
        pageState.setError(null);
        (async () => {
            try {
                pageState.setLoading(true);
                reachedEndRef.current = false;
                nextCursorRef.current = null;
                fetchedSetRef.current.clear();
                await fetchPage('initial');
            } catch (e) {
                pageState.setError('加载失败，请重试');
            } finally {
                pageState.setLoading(false);
            }
        })();
    }, [fetchPage, pageState]);

    return (
        <PageStateView
            loading={pageState.loading}
            error={pageState.error}
            permLoading={permLoading}
            isHost={isHost}
            isEmpty={!pageState.loading && !pageState.error && items.length === 0}
            emptyTitle="暂无游戏记录"
            emptySubtitle="开始一局新游戏，创造精彩回忆！"
            emptyActionText="开始新游戏"
            onEmptyAction={() => navigation.navigate('Home')}
            onRetry={handleRetry}
            onNavigateHome={() => navigation.navigate('Home')}
        >
            <LinearGradient
                colors={[color.background, color.lightBackground]}
                style={styles.container}
            >
                {/* 页面头部 */}
                <LinearGradient
                    colors={[color.primary, color.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <MaterialCommunityIcons name="history" size={24} color={color.lightText} />
                            <Text style={styles.headerTitle}>游戏历史</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={onRefresh}
                                activeOpacity={0.7}
                                disabled={pageState.refreshing}
                            >
                                <MaterialCommunityIcons 
                                    name={pageState.refreshing ? "loading" : "refresh"} 
                                    size={20} 
                                    color={color.lightText} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    {/* 统计信息 */}
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <MaterialCommunityIcons name="cards-variant" size={16} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.statChipText}>{items.length} 场游戏</Text>
                        </View>
                        {items.length > 0 && (
                            <View style={[styles.statChip, { marginLeft: Spacing.sm }]}>
                                <MaterialCommunityIcons name="currency-usd" size={16} color="rgba(255, 255, 255, 0.8)" />
                                <Text style={styles.statChipText}>
                                    总流水 ${Math.abs(items.reduce((sum, item) => sum + item.totalBuyInCash, 0)).toFixed(0)}
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={renderGameCard}
                    refreshControl={<RefreshControl refreshing={pageState.refreshing || false} onRefresh={onRefresh} colors={[color.primary]} tintColor={color.primary} />}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        !reachedEndRef.current ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={color.primary} />
                                <Text style={styles.footerLoaderText}>加载更多...</Text>
                            </View>
                        ) : items.length > 0 ? (
                            <View style={styles.footerEnd}>
                                <Text style={styles.footerEndText}>已显示全部记录</Text>
                            </View>
                        ) : null
                    }
                />
            </LinearGradient>
        </PageStateView>
    );
}
