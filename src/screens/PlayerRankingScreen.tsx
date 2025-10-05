import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

    // 从 Firestore 拉一页
    const fetchPage = useCallback(async (reset = false) => {
        try {
            if (reset) {
                pageState.setLoading(true);
                pageState.setHasNextPage(true);
                setLastDoc(null);
            } else {
                if (!pageState.hasNextPage || pageState.isLoadingMore) return;
                pageState.setIsLoadingMore(true);
            }

            // ✅ 只使用一次 orderBy(sortBy, 'desc')
            const baseRef = collection(db, userDoc);
            let q = query(baseRef, orderBy(sortBy, 'desc'), limit(PAGE_SIZE));
            if (!reset && lastDoc) {
                q = query(baseRef, orderBy(sortBy, 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
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
                setPlayers(prev => [...prev, ...page]);
            }

            setLastDoc(docs[docs.length - 1] ?? null);
            pageState.setHasNextPage(docs.length === PAGE_SIZE);
            pageState.setError(null);
        } catch (err) {
            console.error(err);
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
        }
    }, [sortBy, lastDoc, pageState]);

    // 首次 & 排序变化：重新拉首屏
    useEffect(() => {
        fetchPage(true);
    }, [sortBy, fetchPage]);

    // 下拉刷新
    const onRefresh = useCallback(() => {
        pageState.setRefreshing(true);
        fetchPage(true);
    }, [fetchPage, pageState]);

    // 触底加载
    const onEndReached = useCallback(() => {
        if (!pageState.loading && !pageState.refreshing && pageState.hasNextPage && !pageState.isLoadingMore) {
            fetchPage(false);
        }
    }, [pageState, fetchPage]);

    const clearKeyword = useCallback(() => setKeyword(''), []);

    // 切换排序（服务端字段）
    const handleSortByTotalProfit = useCallback(() => setSortBy(SORT_TYPES.TOTAL_PROFIT), []);
    const handleSortByRoi = useCallback(() => setSortBy(SORT_TYPES.ROI), []);
    const handleSortByAppearances = useCallback(() => setSortBy(SORT_TYPES.APPEARANCES), []);

    // 本地搜索 +（为了 UI 一致）本地再排序一次（与服务端一致的 key）
    const filteredPlayers = useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        const list = kw ? players.filter(p => (p.nickname || '').toLowerCase().includes(kw)) : players;

        return list.slice().sort((a, b) => {
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
    }, [players, keyword, sortBy]);

    const keyExtractor = useCallback((item: AggregatedPlayer) => item.id, []);
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
        fetchPage(true);
    }, [fetchPage]);

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
                    onEndReachedThreshold={0.5}
                    onEndReached={onEndReached}
                    ListFooterComponent={ListFooter}
                />
            </View>
        </PageStateView>
    );
}
