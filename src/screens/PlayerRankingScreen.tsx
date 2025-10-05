import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    StyleSheet,
} from 'react-native';
import { collection, getDocs, limit, orderBy, query, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { userDoc } from '@/constants/namingVar';
import Toast from 'react-native-toast-message';
import { GamePlayerRankstyles as styles } from '@/assets/styles';
import { usePaginatedPageState } from '@/hooks/usePageState';
import { PageStateView } from '@/components/PageState';

// ===== 常量：服务端可排序字段（必须与 Firestore 索引一致）=====
const SORT_TYPES = {
    TOTAL_PROFIT: 'totalProfit', // 总收益（现金口径）
    // ROI 存储为加权 ROI（totalProfit / totalBuyInCash），即一个比率：0.2 表示 20%
    ROI: 'averageROI',
    APPEARANCES: 'gamesPlayed',  // 参与场次
} as const;

const AVATAR_COLORS = [color.card, color.warning, color.cancel, color.success, color.info, color.primary, color.strongGray];

// ===== 类型（与 Firestore 聚合结构一致）=====
export type AggregatedPlayer = {
    id: string;
    nickname: string;
    totalProfit: number; // 现金收益累计
    averageROI: number;      // ROI 累计（平均时除以 gamesPlayed）
    gamesPlayed: number;
    photoURL?: string;
};

// ===== 头像子项（保持你原样）=====
const PlayerItem = React.memo(({ item, index }: { item: AggregatedPlayer; index: number }) => {
    const safeName = item.nickname || '未知玩家';
    const avatarColor = useMemo(() => {
        const ch = safeName.charCodeAt(0) || 0;
        return AVATAR_COLORS[ch % AVATAR_COLORS.length];
    }, [safeName]);

    // 平均 ROI（%）：averageROI 在后端/写入端已保持为加权比率（totalProfit / totalBuyInCash）
    const roiAvg = (Number(item.averageROI) || 0) * 100;
    const roiText = roiAvg.toFixed(1);
    const isRoiPositive = roiAvg >= 0;
    const isCashPositive = (Number(item.totalProfit) || 0) >= 0;

    const renderRankBadge = () => {
    let badgeColor = color.mediumGray;
    if (index === 0) badgeColor = color.card;
    else if (index === 1) badgeColor = color.weakGray;
    else if (index === 2) badgeColor = color.borderColor;
        return (
            <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.rankBadgeText}>{index + 1}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.playerCard, index < 3 && styles.topPlayerCard]}>
            <View style={styles.playerHeader}>
                {renderRankBadge()}

                <View style={styles.avatar}>
                    {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
                            <Text style={styles.avatarText}>{safeName.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.nameContainer}>
                    <Text style={styles.playerName}>{safeName}</Text>
                    <View style={styles.gamesContainer}>
                        <MaterialCommunityIcons name="cards-playing-outline" size={14} color={color.valueLabel} />
                        <Text style={styles.gamesText}>{Number(item.gamesPlayed) || 0} 场游戏</Text>
                    </View>
                </View>

                <View style={[styles.profitBadge, { backgroundColor: isCashPositive ? color.confirm : color.cancel }]}>
                    <Text style={[styles.profitText, { color: color.lightBackground }]}>
                        {isCashPositive ? '+' : ''}{(Number(item.totalProfit) || 0).toFixed(2)}
                    </Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar-check" size={16} color={color.highLighter} />
                    <View style={styles.statTexts}>
                        <Text style={styles.statValue}>{Number(item.gamesPlayed) || 0}</Text>
                        <Text style={styles.statLabel}>场次</Text>
                    </View>
                </View>

                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color={color.highLighter} />
                    <View style={styles.statTexts}>
                        <Text style={[styles.statValue, { color: isCashPositive ? color.success : color.error }]}> 
                            ${Math.abs(Number(item.totalProfit) || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>{isCashPositive ? '盈利' : '亏损'}</Text>
                    </View>
                </View>

                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="chart-line" size={16} color={color.highLighter} />
                    <View style={styles.statTexts}>
                        <Text style={[styles.statValue, { color: isRoiPositive ? color.success : color.error }]}>{roiText}%</Text>
                        <Text style={styles.statLabel}>ROI</Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

// ===== 空列表组件 =====
const EmptyListComponent = React.memo(({ keyword }: { keyword: string }) => (
    <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name={keyword ? 'account-search' : 'account-group'} size={60} color={color.weakGray} />
        <Text style={styles.emptyTitle}>{keyword ? '未找到匹配玩家' : '暂无玩家数据'}</Text>
        <Text style={styles.emptyText}>{keyword ? '尝试使用其他关键词搜索' : '完成游戏后玩家数据将在此显示'}</Text>
    </View>
));

export default function PlayerRankingScreen() {
    const pageState = usePaginatedPageState();
    const [players, setPlayers] = useState<AggregatedPlayer[]>([]);
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState<typeof SORT_TYPES[keyof typeof SORT_TYPES]>(SORT_TYPES.TOTAL_PROFIT);

    // 分页核心
    const PAGE_SIZE = 20;
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const initializedRef = useRef<{ [key: string]: boolean }>({}); // 防止重复初始化，按 sortBy 区分
    const isLoadingRef = useRef<boolean>(false); // 防止重复加载
    const hasNextPageRef = useRef<boolean>(true); // 用 ref 确保状态同步

    // 从 Firestore 拉一页
    const fetchPage = useCallback(async (reset = false) => {
        // 防止重复加载
        if (isLoadingRef.current) {
            return;
        }
        
        try {
            isLoadingRef.current = true;
            const currentSortBy = sortBy; // 捕获当前 sortBy
            const currentLastDoc = reset ? null : lastDoc;
            
            if (reset) {
                pageState.setLoading(true);
                pageState.setHasNextPage(true);
                hasNextPageRef.current = true; // 同步更新 ref
                setLastDoc(null);
            } else {
                if (!hasNextPageRef.current) {
                    return;
                }
                if (pageState.isLoadingMore) {
                    return;
                }
                pageState.setIsLoadingMore(true);
            }

            // ✅ 只使用一次 orderBy(currentSortBy, 'desc')
            const baseRef = collection(db, userDoc);
            let q = query(baseRef, orderBy(currentSortBy, 'desc'), limit(PAGE_SIZE));
            if (!reset && currentLastDoc) {
                q = query(baseRef, orderBy(currentSortBy, 'desc'), startAfter(currentLastDoc), limit(PAGE_SIZE));
            }

            const snap = await getDocs(q);
            const docs = snap.docs;

            const page: AggregatedPlayer[] = docs.map((d) => {
                const data: any = d.data() ?? {};
                return {
                    id: d.id,
                    nickname: data.nickname ?? '未知玩家',
                    totalProfit: Number(data.totalProfit) || 0,
                    averageROI: Number(data.averageROI) || 0,
                    gamesPlayed: Number(data.gamesPlayed) || 0,
                    photoURL: data.photoURL ?? '',
                };
            });
            if (reset) {
                setPlayers(page);
            } else {
                // 使用 Map 去重，防止重复的玩家数据
                setPlayers(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPlayers = page.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPlayers];
                });
            }

            // 更新 lastDoc 和分页状态
            const newLastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
            setLastDoc(newLastDoc);
            
            // 如果返回的文档数量少于 PAGE_SIZE，说明没有更多数据了
            const hasMore = docs.length === PAGE_SIZE;
            pageState.setHasNextPage(hasMore);
            hasNextPageRef.current = hasMore; // 同步更新 ref
            
            pageState.setError(null);
        } catch (err) {
            console.error('[PlayerRanking] Fetch error:', err);
            pageState.setError('加载失败，请检查网络连接或稍后重试');
            Toast.show({
                type: 'error',
                text1: '加载失败',
                text2: '请检查网络连接或稍后重试。',
            });
        } finally {
            pageState.setLoading(false);
            pageState.setIsLoadingMore(false);
            pageState.setRefreshing(false);
            isLoadingRef.current = false;
        }
    }, []); // 移除所有依赖，在函数内部捕获当前状态

    // 首次 & 排序变化：重新拉首屏
    useEffect(() => {
        if (initializedRef.current[sortBy]) {
            return; // 避免重复初始化同一个 sortBy
        }
        
        initializedRef.current[sortBy] = true;
        
        // 使用 setTimeout 避免状态更新冲突
        const timeoutId = setTimeout(() => {
            fetchPage(true);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [sortBy]); // 移除 fetchPage 依赖

    // 下拉刷新
    const onRefresh = useCallback(() => {
        pageState.setRefreshing(true);
        pageState.setError(null);
        pageState.setHasNextPage(true);
        hasNextPageRef.current = true; // 重置 ref
        setLastDoc(null);
        isLoadingRef.current = false; // 重置加载状态
        fetchPage(true);
    }, []); // 移除 fetchPage 和 pageState 依赖

    // 触底加载
    const onEndReached = useCallback(() => {

        if (pageState.loading || pageState.refreshing || !hasNextPageRef.current || pageState.isLoadingMore || isLoadingRef.current) {
            return;
        }
        
        fetchPage(false);
    }, []); // 移除所有依赖

    const clearKeyword = useCallback(() => setKeyword(''), []);

    // 切换排序（服务端字段）
    const handleSortByTotalProfit = useCallback(() => {
        if (sortBy !== SORT_TYPES.TOTAL_PROFIT) {
            // 重置玩家列表和分页状态
            setPlayers([]);
            setLastDoc(null);
            pageState.setHasNextPage(true);
            hasNextPageRef.current = true; // 重置 ref
            isLoadingRef.current = false; // 重置加载状态
            initializedRef.current = {}; // 重置初始化状态
            setSortBy(SORT_TYPES.TOTAL_PROFIT);
        }
    }, [sortBy, pageState]);
    
    const handleSortByRoi = useCallback(() => {
        if (sortBy !== SORT_TYPES.ROI) {
            // 重置玩家列表和分页状态
            setPlayers([]);
            setLastDoc(null);
            pageState.setHasNextPage(true);
            hasNextPageRef.current = true; // 重置 ref
            isLoadingRef.current = false; // 重置加载状态
            initializedRef.current = {}; // 重置初始化状态
            setSortBy(SORT_TYPES.ROI);
        }
    }, [sortBy, pageState]);
    
    const handleSortByAppearances = useCallback(() => {
        if (sortBy !== SORT_TYPES.APPEARANCES) {
            // 重置玩家列表和分页状态
            setPlayers([]);
            setLastDoc(null);
            pageState.setHasNextPage(true);
            hasNextPageRef.current = true; // 重置 ref
            isLoadingRef.current = false; // 重置加载状态
            initializedRef.current = {}; // 重置初始化状态
            setSortBy(SORT_TYPES.APPEARANCES);
        }
    }, [sortBy, pageState]);

    // 本地搜索 +（为了 UI 一致）本地再排序一次（与服务端一致的 key）
    const filteredPlayers = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        const list = kw ? players.filter(p => (p.nickname || '').toLowerCase().includes(kw)) : players;

        // 去重，防止重复的玩家数据
        const uniqueList = list.filter((player, index, arr) => 
            arr.findIndex(p => p.id === player.id) === index
        );

        const sorted = uniqueList.slice().sort((a, b) => {
            if (sortBy === SORT_TYPES.TOTAL_PROFIT) return (b.totalProfit || 0) - (a.totalProfit || 0);
            if (sortBy === SORT_TYPES.ROI) {
                // 已将 averageROI 统一为 weighted ratio (totalProfit / totalBuyInCash)
                const ar = Number(a.averageROI) || 0;
                const br = Number(b.averageROI) || 0;
                return br - ar;
            }
            if (sortBy === SORT_TYPES.APPEARANCES) return (b.gamesPlayed || 0) - (a.gamesPlayed || 0);
            return 0;
        });
        return sorted;
    }, [players, keyword, sortBy]);

    const keyExtractor = useCallback((item: AggregatedPlayer, index: number) => {
        // 使用 id + index 确保唯一性，防止重复 key
        return `${item.id}_${index}`;
    }, []);
    const renderItem = useCallback(({ item, index }: { item: AggregatedPlayer; index: number }) => (
        <PlayerItem item={item} index={index} />
    ), []);

    const renderEmptyComponent = useCallback(() => <EmptyListComponent keyword={keyword} />, [keyword]);

    const ListFooter = useMemo(() => {
        if (pageState.isLoadingMore) {
            return (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={color.primary} />
                    <Text style={{ marginTop: 8, color: color.valueLabel }}>加载更多...</Text>
                </View>
            );
        }
            if (!pageState.hasNextPage && players.length > 0) {
            return (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: color.weakGray }}>没有更多了</Text>
                </View>
            );
        }
        return null;
    }, [pageState.isLoadingMore, pageState.hasNextPage, players.length]);

    // 处理重试
    const handleRetry = useCallback(() => {
        initializedRef.current = {}; // 重置初始化状态
        setLastDoc(null);
        isLoadingRef.current = false; // 重置加载状态
        pageState.setHasNextPage(true);
        hasNextPageRef.current = true; // 重置 ref
        pageState.setError(null);
        fetchPage(true);
    }, []); // 移除 fetchPage 依赖

    return (
        <PageStateView
            loading={pageState.loading && !pageState.refreshing}
            error={pageState.error}
            isEmpty={!pageState.loading && !pageState.error && players.length === 0}
            emptyTitle="暂无玩家数据"
            emptySubtitle="完成游戏后玩家数据将在此显示"
            onRetry={handleRetry}
        >
            <View style={styles.container}>
                {/* 搜索栏 */}
                    <View style={styles.header}>
                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color={color.valueLabel} />
                        <TextInput
                            placeholder="搜索玩家昵称..."
                            value={keyword}
                            onChangeText={setKeyword}
                            style={styles.searchInput}
                            placeholderTextColor={color.weakGray}
                        />
                        {keyword.length > 0 && (
                            <TouchableOpacity onPress={clearKeyword}>
                                <MaterialCommunityIcons name="close-circle" size={16} color={color.weakGray} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* 排序按钮 */}
                <View style={styles.sortContainer}>
                    <View style={styles.sortButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === SORT_TYPES.TOTAL_PROFIT && styles.sortButtonActive]}
                            onPress={handleSortByTotalProfit}
                        >
                            <MaterialCommunityIcons name="cash" size={16} color={sortBy === SORT_TYPES.TOTAL_PROFIT ? color.lightText : color.text} />
                            <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.TOTAL_PROFIT && styles.sortButtonTextActive]}>
                                累计收益
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === SORT_TYPES.ROI && styles.sortButtonActive]}
                            onPress={handleSortByRoi}
                        >
                            <MaterialCommunityIcons name="percent" size={16} color={sortBy === SORT_TYPES.ROI ? color.lightText : color.text} />
                            <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.ROI && styles.sortButtonTextActive]}>
                                平均 ROI
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === SORT_TYPES.APPEARANCES && styles.sortButtonActive]}
                            onPress={handleSortByAppearances}
                        >
                            <MaterialCommunityIcons name="calendar-multiple" size={16} color={sortBy === SORT_TYPES.APPEARANCES ? color.lightText : color.text} />
                            <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.APPEARANCES && styles.sortButtonTextActive]}>
                                参与场次
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 列表 */}
                    <FlatList data={filteredPlayers}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={pageState.refreshing || false} onRefresh={onRefresh} colors={[color.primary]} />
                    }
                    ListEmptyComponent={renderEmptyComponent}
                    onEndReachedThreshold={0.1}
                    onEndReached={onEndReached}
                    ListFooterComponent={ListFooter}
                />
            </View>
        </PageStateView>
    );
}
