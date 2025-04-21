import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
} from 'react-native';
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette as color } from '@/constants';
import { userDoc } from '@/constants/namingDb';
import { AggregatedPlayer, SortType, FirebasePlayer } from '@/types';
import Toast from 'react-native-toast-message';

// 提取出常量
const SORT_TYPES = {
    TOTAL_PROFIT: 'totalProfit',    // ✅ Firestore 字段：totalProfit
    ROI: 'roiSum',                  // ✅ Firestore 字段：roiSum（后续你再前端算平均）
    APPEARANCES: 'gamesPlayed',    // ✅ Firestore 字段：gamesPlayed
};
const AVATAR_COLORS = ['#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#673AB7'];

// 将子组件提取出来提高性能
const PlayerItem = React.memo(({ item, index }: { item: AggregatedPlayer; index: number }) => {
    const avatarColor = useMemo(() => {
        const colorIndex = item.nickname.charCodeAt(0) % AVATAR_COLORS.length;
        return AVATAR_COLORS[colorIndex];
    }, [item.nickname]);
    
    const initialLetter = item.nickname.charAt(0).toUpperCase();
    const roi = item.gamesPlayed > 0
        ? ((item.roiSum / item.gamesPlayed) * 100).toFixed(1)
        : '0.0';
    const isRoiPositive = item.roiSum >= 0;
    const isCashPositive = item.totalProfit >= 0;

    const renderRankBadge = () => {
        let badgeColor = '#E0E0E0';
        if (index === 0) badgeColor = '#FFD700';
        else if (index === 1) badgeColor = '#C0C0C0';
        else if (index === 2) badgeColor = '#CD7F32';

        return (
            <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.rankBadgeText}>{index + 1}</Text>
            </View>
        );
    };

    return (
        <View style={[
            styles.playerCard,
            index < 3 && styles.topPlayerCard
        ]}>
            <View style={styles.playerHeader}>
                {renderRankBadge()}

                <View style={styles.avatar}>
                    {item.photoURL ? (
                        <Image
                            source={{ uri: item.photoURL }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
                            <Text style={styles.avatarText}>{initialLetter}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.nameContainer}>
                    <Text style={styles.playerName}>{item.nickname}</Text>
                    <View style={styles.gamesContainer}>
                        <MaterialCommunityIcons name="cards-playing-outline" size={14} color="#7f8c8d" />
                        <Text style={styles.gamesText}>{item.gamesPlayed} 场游戏</Text>
                    </View>
                </View>

                <View style={[
                    styles.profitBadge,
                    { backgroundColor: isCashPositive ? '#e8f5e9' : '#ffebee' }
                ]}>
                    <Text style={[
                        styles.profitText,
                        { color: isCashPositive ? '#4CAF50' : '#F44336' }
                    ]}>
                        {isCashPositive ? '+' : ''}{item.totalProfit.toFixed(2)}
                    </Text>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="calendar-check" size={16} color={color.iconHighlighter} />
                    <View style={styles.statTexts}>
                        <Text style={styles.statValue}>{item.gamesPlayed}</Text>
                        <Text style={styles.statLabel}>场次</Text>
                    </View>
                </View>

                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color={color.iconHighlighter} />
                    <View style={styles.statTexts}>
                        <Text style={[
                            styles.statValue,
                            { color: isCashPositive ? '#2ecc71' : '#e74c3c' }
                        ]}>
                            ${Math.abs(item.totalProfit).toFixed(2)}
                        </Text>
                        <Text style={styles.statLabel}>{isCashPositive ? '盈利' : '亏损'}</Text>
                    </View>
                </View>

                <View style={styles.statItem}>
                    <MaterialCommunityIcons
                        name="chart-line"
                        size={16}
                        color={color.iconHighlighter}
                    />
                    <View style={styles.statTexts}>
                        <Text style={[
                            styles.statValue,
                            { color: isRoiPositive ? '#2ecc71' : '#e74c3c' }
                        ]}>
                            {roi}%
                        </Text>
                        <Text style={styles.statLabel}>ROI</Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

// 空列表组件
const EmptyListComponent = React.memo(({ keyword }: { keyword: string }) => (
    <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
            name={keyword ? "account-search" : "account-group"}
            size={60}
            color="#bdc3c7"
        />
        <Text style={styles.emptyTitle}>
            {keyword ? "未找到匹配玩家" : "暂无玩家数据"}
        </Text>
        <Text style={styles.emptyText}>
            {keyword
                ? "尝试使用其他关键词搜索"
                : "完成游戏后玩家数据将在此显示"
            }
        </Text>
    </View>
));

export default function PlayerRankingScreen() {
    const [players, setPlayers] = useState<AggregatedPlayer[]>([]);
    const [keyword, setKeyword] = useState('');
    const [sortBy, setSortBy] = useState(SORT_TYPES.TOTAL_PROFIT);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null); // 🌟 分页核心
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const fetchPlayers = useCallback(async (isRefresh = false) => {
        if (!isRefresh && (loadingMore || !hasMore)) return;

        if (isRefresh) {
            setLoading(true);
            setLastDoc(null);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const ref = collection(db, userDoc);
            let q = query(ref, orderBy(sortBy, 'desc'), limit(20));

            if (!isRefresh && lastDoc) {
                q = query(q, orderBy(sortBy, 'desc'), startAfter(lastDoc), limit(20));
            }

            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            const newList = docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    nickname: data.nickname ?? '未知玩家',
                    totalProfit: data.totalProfit ?? 0,
                    roiSum: data.roiSum ?? 0,
                    gamesPlayed: data.gamesPlayed ?? 0,
                    photoURL: data.photoURL ?? '',
                };
            });

            setPlayers((prev) => isRefresh ? newList : [...prev, ...newList]);
            setLastDoc(docs[docs.length - 1]);
            setHasMore(docs.length === 20);
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: '加载失败',
                text2: '请检查网络连接或稍后重试。',
            });
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [lastDoc, sortBy, loadingMore, hasMore]);

    useEffect(() => {
        fetchPlayers(true); // 🌟 排序时刷新
    }, [sortBy]);


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchPlayers(true);
    }, [fetchPlayers]);

    const clearKeyword = useCallback(() => {
        setKeyword('');
    }, []);

    const handleSortByTotalProfit = useCallback(() => {
        setSortBy(SORT_TYPES.TOTAL_PROFIT);
    }, []);

    const handleSortByRoi = useCallback(() => {
        setSortBy(SORT_TYPES.ROI);
    }, []);

    const handleSortByAppearances = useCallback(() => {
        setSortBy(SORT_TYPES.APPEARANCES);
    }, []);

    const filteredPlayers = useMemo(() => {
        return players
            .filter((p) => p.nickname.toLowerCase().includes(keyword.toLowerCase()))
            .sort((a, b) => {
                if (sortBy === SORT_TYPES.TOTAL_PROFIT) return b.totalProfit - a.totalProfit;
                if (sortBy === SORT_TYPES.ROI)
                    return b.gamesPlayed > 0 && a.gamesPlayed > 0
                        ? b.roiSum / b.gamesPlayed - a.roiSum / a.gamesPlayed
                        : 0;
                if (sortBy === SORT_TYPES.APPEARANCES) return b.gamesPlayed - a.gamesPlayed;
                return 0;
            });
    }, [players, keyword, sortBy]);

    const keyExtractor = useCallback((item: AggregatedPlayer): string => item.id, []);
    const renderItem = useCallback(({ item, index }: { item: AggregatedPlayer; index: number }) => (
        <PlayerItem item={item} index={index} />
    ), []);

    const renderEmptyComponent = useCallback(() => (
        <EmptyListComponent keyword={keyword} />
    ), [keyword]);

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={"#d46613"} />
                <Text style={styles.loadingText}>加载排行榜数据...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>玩家排行榜</Text>
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#7f8c8d" />
                    <TextInput
                        placeholder="搜索玩家昵称..."
                        value={keyword}
                        onChangeText={setKeyword}
                        style={styles.searchInput}
                        placeholderTextColor="#95a5a6"
                    />
                    {keyword.length > 0 && (
                        <TouchableOpacity onPress={clearKeyword}>
                            <MaterialCommunityIcons name="close-circle" size={16} color="#95a5a6" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>排序方式:</Text>
                <View style={styles.sortButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === SORT_TYPES.TOTAL_PROFIT && styles.sortButtonActive]}
                        onPress={handleSortByTotalProfit}
                    >
                        <MaterialCommunityIcons
                            name="cash"
                            size={16}
                            color={sortBy === SORT_TYPES.TOTAL_PROFIT ? '#FFFFFF' : '#666666'}
                        />
                        <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.TOTAL_PROFIT && styles.sortButtonTextActive]}>
                            累计收益
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === SORT_TYPES.ROI && styles.sortButtonActive]}
                        onPress={handleSortByRoi}
                    >
                        <MaterialCommunityIcons
                            name="percent"
                            size={16}
                            color={sortBy === SORT_TYPES.ROI ? '#FFFFFF' : '#666666'}
                        />
                        <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.ROI && styles.sortButtonTextActive]}>
                            平均 ROI
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.sortButton, sortBy === SORT_TYPES.APPEARANCES && styles.sortButtonActive]}
                        onPress={handleSortByAppearances}
                    >
                        <MaterialCommunityIcons
                            name="calendar-multiple"
                            size={16}
                            color={sortBy === SORT_TYPES.APPEARANCES ? '#FFFFFF' : '#666666'}
                        />
                        <Text style={[styles.sortButtonText, sortBy === SORT_TYPES.APPEARANCES && styles.sortButtonTextActive]}>
                            参与场次
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredPlayers}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#d46613"]}
                    />
                }
                ListEmptyComponent={renderEmptyComponent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
    },
    header: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        color: '#34495e',
    },
    sortContainer: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sortLabel: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    sortButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    sortButtonActive: {
        backgroundColor: "#d46613",
    },
    sortButtonText: {
        fontSize: 12,
        color: '#666666',
        marginLeft: 4,
    },
    sortButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    list: {
        padding: 12,
        paddingBottom: 24,
    },
    playerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    topPlayerCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#FFD700',
    },
    playerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rankBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    nameContainer: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    gamesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    gamesText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginLeft: 4,
    },
    profitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    profitText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#f8f9fa',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    statTexts: {
        marginLeft: 6,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    statLabel: {
        fontSize: 11,
        color: '#7f8c8d',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#7f8c8d',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7f8c8d',
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#95a5a6',
        marginTop: 8,
        textAlign: 'center',
    },
});