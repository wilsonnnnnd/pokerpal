// src/screens/GameHistoryScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    limit,
    startAfter,
    QueryDocumentSnapshot,
    where,
    documentId,
} from 'firebase/firestore';
import { db } from '@/firebase/config';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { Spacing } from '@/constants/designTokens';
import Toast from 'react-native-toast-message';

import { GameHistorystyles as styles } from '@/assets/styles';
import { gameDoc, hostGameDoc, playerDoc } from '@/constants/namingVar';
import { fetchUserProfilesMap, resolveNameAndPhoto } from '@/firebase/fetchData';
import { GameHistoryItem, PlayerItem } from '@/types';
import usePermission from '@/hooks/usePermission';
import { GameCard } from '@/components/GameCard';
import { getHosterId } from '@/utils/hostInfo';
import { usePaginatedPageState } from '@/hooks/usePageState';
import { usePageState } from '@/hooks/usePageState';
import simpleT from '@/i18n/simpleT';
import gameHistoryService from '@/services/gameHistoryService';
import { PageStateView } from '@/components/PageState';

// ---- 导航类型 ----
type HomeScreenNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

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
    // Local tab state & pageState
    const [tab, setTab] = useState<'cloud' | 'local'>('cloud');
    const localPageState = usePageState();
    const [localItems, setLocalItems] = useState<any[]>([]);
    // segmented control styles with improved design consistency
    const segStyles: any = {
        container: {
            flexDirection: 'row',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: 3,
            borderRadius: 14,
            alignItems: 'center',
            marginLeft: Spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        button: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 11,
            minWidth: 60,
            alignItems: 'center',
        },
        activeButton: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3,
        },
        activeText: {
            color: color.primary,
            fontWeight: '700',
            fontSize: 13,
        },
        inactiveText: {
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: '600',
            fontSize: 13,
        },
    };

    // 分页相关refs
    const nextCursorRef = useRef<QueryDocumentSnapshot | null>(null);
    const reachedEndRef = useRef<boolean>(false);
    const fetchedSetRef = useRef<Set<string>>(new Set());
    const initializedRef = useRef<boolean>(false); // 防止重复初始化
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 防抖计时器
    const endReachedDebounceRef = useRef<NodeJS.Timeout | null>(null); // 触底加载防抖


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

    // ---- 本地历史加载 (来自 LocalHistoryScreen) ----
    const loadLocalHistory = async () => {
        localPageState.setError(null);
        localPageState.setLoading(true);
        try {
            const result = await gameHistoryService.loadGameHistory();
            setLocalItems(result.historyItems || []);
            if (result.error) {
                localPageState.setError(result.error);
            }
        } catch (e: any) {
            console.warn('load db error', e);
            localPageState.setError(e?.message ?? String(e));
            setLocalItems([]);
        } finally {
            localPageState.setLoading(false);
        }
    };

    // ...existing code...


    // —— 构建单条 GameHistoryItem（从主集合 /test-games/{gameId} + /players 聚合）——
    const buildGameHistoryItem = useCallback(
        async (
            gameId: string,
            owner?: string,
            preFetchedMainData?: any,
            indexAgg?: any
        ): Promise<GameHistoryItem | null> => {
            try {
                let data: any = preFetchedMainData ?? null;
                let usedMainPath = false;

                if (!data) {
                    const mainSnap = await getDoc(doc(db, gameDoc, gameId));
                    if (mainSnap.exists()) {
                        data = mainSnap.data() ?? {};
                        usedMainPath = true;
                    }
                } else {
                    usedMainPath = true;
                }

                if (!data && owner) {
                    const altSnap = await getDoc(doc(db, gameDoc, owner, 'game', gameId));
                    if (altSnap.exists()) {
                        data = altSnap.data() ?? {};
                        usedMainPath = false;
                    }
                }

                if (!data) return null;

                let players: PlayerItem[] | undefined = undefined;
                let totalBuyInCash = 0,
                    totalEndingCash = 0,
                    totalDiffCash = 0;

                if (indexAgg && (indexAgg.totalBuyInCash !== undefined || indexAgg.playerCount !== undefined)) {
                    totalBuyInCash = Number(indexAgg.totalBuyInCash) || 0;
                    totalEndingCash = Number(indexAgg.totalEndingCash) || 0;
                    totalDiffCash = Number(indexAgg.totalDiffCash) || 0;
                } else {
                    const playersColRef = usedMainPath
                        ? collection(db, gameDoc, gameId, playerDoc)
                        : collection(db, gameDoc, owner || '', 'game', gameId, playerDoc);

                    const playersSnap = await getDocs(playersColRef);
                    const playerIds = playersSnap.docs.map((d) => String(d.id)).filter(Boolean);
                    const profilesMap = await fetchUserProfilesMap(playerIds);

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

                    for (const p of players) {
                        totalBuyInCash += p.totalBuyInCash;
                        totalEndingCash += p.settleCashAmount;
                        totalDiffCash += p.settleCashDiff;
                    }
                }

                const created = data.created?.toDate ? data.created.toDate().toISOString() : data.created || new Date().toISOString();
                const updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updated || created;

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
                // keep quiet here; caller will handle nulls
                // eslint-disable-next-line no-console
                console.error('[buildGameHistoryItem] error', e);
                return null;
            }
        },
        []
    );

    // —— 分页读取 host 的游戏列表 —— 
    // 路径：/host-games/{hoster}/games  按 created desc
    const fetchPage = useCallback(
        async (mode: 'refresh' | 'append' | 'initial') => {
            const hoster = await getHosterId();
            if (!hoster) {
                setItems([]);
                reachedEndRef.current = true;
                nextCursorRef.current = null;
                return;
            }

            const baseCol = collection(doc(db, hostGameDoc, hoster), gameDoc);

            // Fetch page without relying on orderBy on index docs (some index docs may not have created)
            const q = nextCursorRef.current
                ? query(baseCol, startAfter(nextCursorRef.current), limit(PAGE_SIZE))
                : query(baseCol, limit(PAGE_SIZE));

            const snap = await getDocs(q);
            const docs = snap.docs as QueryDocumentSnapshot[];
            if (docs.length === 0) {
                if (mode !== 'refresh') reachedEndRef.current = true;
                return;
            }

            const ids = docs.map((d) => d.id).filter((id) => {
                if (fetchedSetRef.current.has(id)) return false;
                fetchedSetRef.current.add(id);
                return true;
            });

            const mainMap = await fetchMainGamesByIds(ids);

            const indexAggMap = new Map<string, any>();
            for (const d of docs) {
                indexAggMap.set(d.id, d.data());
            }

            const detailList = await Promise.all(
                ids.map((gid) => buildGameHistoryItem(gid, hoster, mainMap.get(gid), indexAggMap.get(gid)))
            );

            const built = (detailList.filter(Boolean) as GameHistoryItem[]).sort(
                (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
            );

            if (mode === 'refresh' || mode === 'initial') {
                setItems(built);
            } else {
                setItems((prev) => [...prev, ...built]);
            }

            nextCursorRef.current = docs.length === PAGE_SIZE ? docs[docs.length - 1] : null;
            if (!nextCursorRef.current) reachedEndRef.current = true;
        },
        [buildGameHistoryItem]
    );

    // —— 首屏加载 ——
    useEffect(() => {
        console.log('[useEffect] permLoading:', permLoading, 'isHost:', isHost, 'initializedRef.current:', initializedRef.current); // 添加日志
        
        // 权限检查：如果不是 host，则不自动跳转 —— 切换到本地历史 tab
        if (!permLoading && isHost === false) {
            console.log('[useEffect] Not a host, switching to local tab');
            setTab('local');
        }

        // 只在 cloud tab 并且为 host 时初始化 cloud 的首屏
        if (tab !== 'cloud') {
            return;
        }

        if (permLoading || isHost === false || initializedRef.current) {
            console.log('[useEffect] Skipping cloud initialization - permLoading:', permLoading, 'isHost:', isHost, 'initialized:', initializedRef.current);
            return;
        }

        console.log('[useEffect] Starting initialization'); // 添加日志
        // 立即设置加载状态，避免先显示空状态
        pageState.setLoading(true);
        initializedRef.current = true;

        // 使用防抖延迟执行，避免快速连续触发
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            (async () => {
                try {
                    // 重置分页状态
                    reachedEndRef.current = false;
                    nextCursorRef.current = null;
                    fetchedSetRef.current.clear();
                    await fetchPage('initial');
                } catch (e) {
                    pageState.setError(simpleT('err_loading_game_history'));
                    Toast.show({
                        type: 'error',
                        text1: simpleT('err_loading_title'),
                        text2: simpleT('err_loading_msg'),
                        position: 'bottom',
                        visibilityTime: 2000,
                    });
                } finally {
                    pageState.setLoading(false);
                }
            })();
        }, 100); // 100ms 防抖延迟

        // 清理函数
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
                debounceTimeoutRef.current = null;
            }
        };
    }, [permLoading, isHost, navigation]); // 移除 fetchPage 和 pageState 依赖

    // 组件卸载时清理所有计时器
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (endReachedDebounceRef.current) {
                clearTimeout(endReachedDebounceRef.current);
            }
        };
    }, []);

    // —— 下拉刷新 ——
    const onRefresh = useCallback(async () => {
        // 防抖：如果已有刷新在进行，则忽略
        if (pageState.refreshing || pageState.loading) {
            return;
        }

        try {
            pageState.setRefreshing(true);
            pageState.setError(null);
            reachedEndRef.current = false;
            nextCursorRef.current = null;
            fetchedSetRef.current.clear();

            // 添加小延迟确保 UI 状态正确更新
            await new Promise(resolve => setTimeout(resolve, 50));
            // 根据当前 tab 执行刷新
            if (tab === 'cloud') {
                await fetchPage('refresh');
            } else {
                await loadLocalHistory();
            }
        } finally {
            pageState.setRefreshing(false);
        }
    }, []); // 移除所有依赖

    // —— 触底加载更多 ——
    const onEndReached = useCallback(async () => {
        // 防抖：避免快速连续触发
        if (endReachedDebounceRef.current) {
            clearTimeout(endReachedDebounceRef.current);
        }

        endReachedDebounceRef.current = setTimeout(async () => {
            if (pageState.loading || pageState.refreshing) return;
            if (reachedEndRef.current) return;
            if (pageState.isLoadingMore) return; // 防止重复加载

            try {
                if (tab === 'cloud') {
                    pageState.setIsLoadingMore(true);
                    await fetchPage('append');
                }
            } catch {
                // 忽略
            } finally {
                pageState.setIsLoadingMore(false);
            }
        }, 200); // 200ms 防抖延迟
    }, []); // 移除所有依赖

    // —— 渲染卡片 ——  
    const renderGameCard = ({ item, index }: { item: GameHistoryItem; index: number }) => (
        <GameCard
            item={item}
            index={index}
            onPress={(game) => navigation.navigate('GameDetail', { game })}
        />
    );

    // 本地历史渲染：LocalHistory 中 item.__history 为实际 game
    const renderLocalCard = ({ item, index }: { item: any; index: number }) => {
        const historyData = item.__history;
        if (!historyData) return null;
        return (
            <GameCard
                item={historyData}
                index={index}
                onPress={(selected) => (navigation as any).navigate('GameDetail', { game: selected, isLocal: true })}
            />
        );
    };

    // 处理重试
    const handleRetry = useCallback(() => {
        // 防抖：避免快速连续点击
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        pageState.setError(null);
        pageState.setLoading(true); // 立即显示加载状态
        initializedRef.current = false; // 重置初始化状态

        debounceTimeoutRef.current = setTimeout(() => {
            (async () => {
                try {
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
        }, 100);
    }, []); // 移除所有依赖

    // 根据 tab 决定当前 pageState / items / empty 文案
    const currentLoading = tab === 'cloud' ? pageState.loading : localPageState.loading;
    const currentError = tab === 'cloud' ? pageState.error : localPageState.error;
    const currentIsEmpty = tab === 'cloud'
        ? (!pageState.loading && !pageState.error && !permLoading && isHost !== null && items.length === 0 && initializedRef.current)
        : (!localPageState.loading && !localPageState.error && localItems.length === 0);

    return (
        <PageStateView
            loading={currentLoading}
            error={currentError}
            permLoading={permLoading}
            isHost={isHost}
            isEmpty={currentIsEmpty}
            emptyTitle={tab === 'cloud' ? simpleT('game_history_empty_title') : simpleT('local_history_empty_title')}
            emptySubtitle={tab === 'cloud' ? simpleT('game_history_empty_subtitle') : simpleT('local_history_empty_subtitle')}
            emptyActionText={simpleT('start_new_game')}
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
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        {/* Tab control - segmented */}
                        <View style={segStyles.container}>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (tab === 'cloud') return;
                                    setTab('cloud');
                                    // force refresh cloud data when switching to cloud
                                    if (isHost === false) {
                                        // not a host: nothing to load
                                        return;
                                    }
                                    pageState.setLoading(true);
                                    try {
                                        // reset pagination to force a fresh load
                                        initializedRef.current = false;
                                        reachedEndRef.current = false;
                                        nextCursorRef.current = null;
                                        fetchedSetRef.current.clear();
                                        await fetchPage('refresh');
                                    } catch (e) {
                                        pageState.setError(simpleT('err_loading_game_history'));
                                    } finally {
                                        pageState.setLoading(false);
                                    }
                                }}
                                style={[segStyles.button, tab === 'cloud' ? segStyles.activeButton : undefined]}
                            >
                                <Text style={tab === 'cloud' ? segStyles.activeText : segStyles.inactiveText}>{simpleT('menu_history')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (tab === 'local') return;
                                    setTab('local');
                                    await loadLocalHistory();
                                }}
                                style={[segStyles.button, tab === 'local' ? segStyles.activeButton : undefined]}
                            >
                                <Text style={tab === 'local' ? segStyles.activeText : segStyles.inactiveText}>{simpleT('menu_local_history')}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={[
                                    styles.headerButton,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: 8,
                                        padding: 8,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                ]}
                                onPress={onRefresh}
                                activeOpacity={0.7}
                                disabled={pageState.refreshing}
                            >
                                <MaterialCommunityIcons
                                    name={pageState.refreshing ? "loading" : "refresh"}
                                    size={18}
                                    color={color.lightText}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {/* 统计信息 - 针对不同 tab 显示 */}
                    <View style={[
                        styles.statsRow,
                        {
                            paddingHorizontal: Spacing.lg,
                            paddingTop: Spacing.sm,
                        }
                    ]}>
                        {tab === 'cloud' ? (
                            <>
                                <View style={[
                                    styles.statChip,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: 20,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                ]}>
                                    <MaterialCommunityIcons name="cards-variant" size={14} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 4 }} />
                                    <Text style={[styles.statChipText, { fontSize: 12, fontWeight: '600' }]}>{items.length} {simpleT('games_stat_suffix')}</Text>
                                </View>
                                {items.length > 0 && (
                                    <View style={[
                                        styles.statChip,
                                        {
                                            marginLeft: Spacing.sm,
                                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                            borderRadius: 20,
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                        }
                                    ]}>
                                        <MaterialCommunityIcons name="currency-usd" size={14} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 4 }} />
                                        <Text style={[styles.statChipText, { fontSize: 12, fontWeight: '600' }]}>
                                            {simpleT('total_flow')}: ${Math.abs(items.reduce((sum, item) => sum + item.totalBuyInCash, 0)).toFixed(0)}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <>
                                <View style={[
                                    styles.statChip,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                        borderRadius: 20,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                    }
                                ]}>
                                    <MaterialCommunityIcons name="file-document" size={14} color="rgba(255, 255, 255, 0.9)" style={{ marginRight: 4 }} />
                                    <Text style={[styles.statChipText, { fontSize: 12, fontWeight: '600' }]}>{simpleT('records_count', undefined, { count: localItems.length })}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </LinearGradient>

                <FlatList
                    data={tab === 'cloud' ? items : localItems}
                    keyExtractor={(item) => tab === 'cloud' ? item.id : String(item.id)}
                    contentContainerStyle={styles.list}
                    renderItem={tab === 'cloud' ? renderGameCard : renderLocalCard}
                    refreshControl={<RefreshControl refreshing={(tab === 'cloud' ? pageState.refreshing : localPageState.refreshing) || false} onRefresh={onRefresh} colors={[color.primary]} tintColor={color.primary} />}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        tab === 'cloud' ? (
                            !reachedEndRef.current ? (
                                <View style={[
                                    styles.footerLoader,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        marginHorizontal: Spacing.lg,
                                        marginVertical: Spacing.md,
                                        borderRadius: 12,
                                        paddingVertical: Spacing.lg,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                    }
                                ]}>
                                    <ActivityIndicator size="small" color={color.primary} style={{ marginBottom: Spacing.xs }} />
                                    <Text style={[
                                        styles.footerLoaderText,
                                        {
                                            color: color.mutedText,
                                            fontSize: 13,
                                            fontWeight: '500',
                                        }
                                    ]}>{simpleT('loading_more')}</Text>
                                </View>
                            ) : items.length > 0 ? (
                                <View style={[
                                    styles.footerEnd,
                                    {
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        marginHorizontal: Spacing.lg,
                                        marginVertical: Spacing.md,
                                        borderRadius: 12,
                                        paddingVertical: Spacing.md,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.08)',
                                    }
                                ]}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color={color.mutedText} style={{ marginBottom: 4 }} />
                                    <Text style={[
                                        styles.footerEndText,
                                        {
                                            color: color.mutedText,
                                            fontSize: 12,
                                            fontWeight: '500',
                                        }
                                    ]}>{simpleT('footer_all_records')}</Text>
                                </View>
                            ) : null
                        ) : null
                    }
                />
            </LinearGradient>
        </PageStateView>
    );
}
