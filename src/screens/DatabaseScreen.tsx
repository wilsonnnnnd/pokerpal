import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Animated, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import localDb from '@/services/localDb';
import { GameHistorystyles as styles } from '@/assets/styles';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const hasLocalDb = Boolean((localDb as any) && typeof (localDb as any).execSql === 'function');

async function execSql(sql: string, args: any[] = []) {
	if (!hasLocalDb) throw new Error('localDb.execSql not available');
	return (localDb as any).execSql(sql, args);
}

// small helper to build a history-style card object from action payload
function toHistoryItem(action: any) {
	// prefer payload if it contains a game snapshot shape
	const payload = action.payload || null;
	if (payload && payload.players && Array.isArray(payload.players)) {
		return {
			id: String(action.id),
			smallBlind: Number(payload.smallBlind ?? 0),
			bigBlind: Number(payload.bigBlind ?? 0),
			created: payload.created ?? action.createdAt ?? new Date().toISOString(),
			updated: payload.updated ?? payload.created ?? action.createdAt ?? new Date().toISOString(),
			totalBuyInCash: Number(payload.totalBuyInCash ?? 0),
			totalEndingCash: Number(payload.totalEndingCash ?? 0),
			totalDiffCash: Number(payload.totalDiffCash ?? 0),
			players: payload.players.map((p: any) => ({
				playerId: String(p.playerId ?? p.id ?? ''),
				nickname: String(p.nickname ?? p.displayName ?? 'Unknown'),
				totalBuyInCash: Number(p.totalBuyInCash) || 0,
				settleCashAmount: Number(p.settleCashAmount) || 0,
				settleCashDiff: Number(p.settleCashDiff) || 0,
				buyInCount: Number(p.buyInCount) || 0,
				photoUrl: p.photoUrl ?? null,
				settleROI: Number(p.settleROI) || 0,
			})),
			__rawAction: action,
		};
	}
	return null;
}

// ---- 本地游戏卡片组件 ----
interface LocalGameCardProps {
    item: any;
    index: number;
    onPress: (item: any) => void;
}

const LocalGameCard: React.FC<LocalGameCardProps> = ({ item, index, onPress }) => {
    const h = item.__history;
    if (!h) return null;

    const players = h.players || [];
    const pickTop = (players: any[]) => {
        if (!players.length) return { winner: null, loser: null };
        const desc = [...players].sort((a, b) => Number(b.settleCashDiff) - Number(a.settleCashDiff));
        const asc = [...players].sort((a, b) => Number(a.settleCashDiff) - Number(b.settleCashDiff));
        return { winner: desc[0], loser: asc[0] };
    };

    const { winner, loser } = pickTop(players);

    // 动画值
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // 进入动画
    useEffect(() => {
        const delay = Math.min(index * 80, 400); // 略快的动画
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay,
                tension: 60,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, fadeAnim, scaleAnim]);

    const handlePress = () => {
        // 点击动画
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();

        onPress(item);
    };

    const { day, month, year, time } = (() => {
        if (!h.created) return { day: '--', month: '--', year: '--', time: '--:--' };
        const d = new Date(h.created);
        return {
            day: String(d.getDate()).padStart(2, '0'),
            month: String(d.getMonth() + 1).padStart(2, '0'),
            year: String(d.getFullYear()),
            time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        };
    })();

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.cardTouchable}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={['#FFFFFF', '#F8FAFB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    {/* 左侧日期区域 - 本地数据标识 */}
                    <LinearGradient
                        colors={[color.primary, color.primary]} // 使用蓝色系区分本地数据
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.dateContainer}
                    >
                        <View style={styles.dateBox}>
                            <Text style={styles.dateText}>{day}</Text>
                            <View style={styles.dateSeparator} />
                            <Text style={styles.monthYearText}>{month}/{year.slice(2)}</Text>
                        </View>
                        <View style={styles.timeContainer}>
                            <MaterialCommunityIcons name="database" size={12} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.timeText}>{time}</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.cardContent}>
                        {/* 头部信息 */}
                        <View style={styles.cardHeader}>
                            <View style={styles.blindsContainer}>
                                <MaterialCommunityIcons name="poker-chip" size={18} color={color.primary} />
                                <Text style={styles.blindsText}>{h.smallBlind}/{h.bigBlind}</Text>
                            </View>
                            <View style={[styles.playerBadge, { backgroundColor: 'rgba(164, 200, 225, 0.1)' }]}>
                                <MaterialCommunityIcons name="account-group" size={16} color={color.info} />
                                <Text style={[styles.playerCountText, { color: color.info }]}>{h.players.length}</Text>
                            </View>
                        </View>

                        {/* 统计数据 */}
                        <View style={styles.statsContainer}>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="bank" size={16} color={color.info} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(h.totalBuyInCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>买入</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="calculator-variant" size={16} color={color.warning} />
                                <View style={styles.statTexts}>
                                    <Text style={styles.statValue}>${Number(h.totalEndingCash).toFixed(0)}</Text>
                                    <Text style={styles.statLabel}>结算</Text>
                                </View>
                            </View>

                            <View style={styles.statDivider} />

                            <View style={styles.statCard}>
                                <MaterialCommunityIcons
                                    name={h.totalDiffCash >= 0 ? 'trending-up' : 'trending-down'}
                                    size={16}
                                    color={h.totalDiffCash >= 0 ? color.success : color.error}
                                />
                                <View style={styles.statTexts}>
                                    <Text
                                        style={[
                                            styles.statValue,
                                            { color: h.totalDiffCash >= 0 ? color.success : color.error },
                                        ]}
                                    >
                                        {h.totalDiffCash >= 0 ? '+' : ''}${Math.abs(Number(h.totalDiffCash)).toFixed(0)}
                                    </Text>
                                    <Text style={styles.statLabel}>差额</Text>
                                </View>
                            </View>
                        </View>

                        {/* 最大赢家/输家 */}
                        {winner && loser && (
                            <View style={styles.playersContainer}>
                                <View style={styles.playerRow}>
                                    <View style={styles.playerInfo}>
                                        <View style={styles.winnerBadge}>
                                            <MaterialCommunityIcons name="trophy" size={12} color="#FFD700" />
                                        </View>
                                        <Text style={styles.playerName} numberOfLines={1}>{winner.nickname}</Text>
                                    </View>
                                    <Text style={[styles.playerProfit, { color: color.success }]}>
                                        +${Number(winner.settleCashDiff).toFixed(0)}
                                    </Text>
                                </View>

                                <View style={styles.playerRow}>
                                    <View style={styles.playerInfo}>
                                        <View style={styles.loserBadge}>
                                            <MaterialCommunityIcons name="arrow-down" size={12} color="#9E9E9E" />
                                        </View>
                                        <Text style={styles.playerName} numberOfLines={1}>{loser.nickname}</Text>
                                    </View>
                                    <Text style={[styles.playerProfit, { color: color.error }]}>
                                        -${Math.abs(Number(loser.settleCashDiff)).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* 右侧箭头 + 本地标识 */}
                        <View style={styles.cardFooter}>
                            <View style={styles.localBadge}>
                                <MaterialCommunityIcons name="hard-hat" size={14} color={color.info} />
                                <Text style={styles.localBadgeText}>本地</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={color.mutedText} />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function DatabaseScreen() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [items, setItems] = useState<any[]>([]);
	const [rawActions, setRawActions] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const nav = useNavigation();

	const load = async () => {
		setError(null);
		setLoading(true);
		try {
			if (!hasLocalDb) {
				setItems([]);
				setError('local database not available in this environment.');
				return;
			}

			// Ensure actions table exists
			await execSql(`CREATE TABLE IF NOT EXISTS actions (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				game_id INTEGER,
				type TEXT,
				payload TEXT,
				createdAt TEXT,
				syncStatus INTEGER DEFAULT 0
			)`);

			const aRes = await execSql(`SELECT id, game_id, type, payload, createdAt, syncStatus FROM actions ORDER BY createdAt DESC`);
			const aOut: any[] = [];
			if (aRes && aRes.rows && Array.isArray((aRes.rows as any)._array)) {
				for (const r of (aRes.rows as any)._array) {
					let parsed = null;
					try {
						if (r.payload && typeof r.payload === 'string') parsed = JSON.parse(r.payload);
						else parsed = r.payload ?? null;
					} catch (e) { parsed = null; }
					aOut.push({ id: r.id, game_id: r.game_id, type: r.type, createdAt: r.createdAt, syncStatus: r.syncStatus, payload: parsed, _source: 'sql' });
				}
			} else {
				for (let i = 0; i < (aRes.rows.length ?? 0); i++) {
					const r = aRes.rows.item(i);
					let parsed = null;
					try {
						if (r.payload && typeof r.payload === 'string') parsed = JSON.parse(r.payload);
						else parsed = r.payload ?? null;
					} catch (e) { parsed = null; }
					aOut.push({ id: r.id, game_id: r.game_id, type: r.type, createdAt: r.createdAt, syncStatus: r.syncStatus, payload: parsed, _source: 'sql' });
				}
			}

			const memStore = (global as any).__pokerpal_store;
			const memActions: any[] = (memStore && Array.isArray(memStore.actions)) ? memStore.actions.map((r: any) => ({
				id: r.id,
				game_id: r.game_id,
				type: r.type,
				createdAt: r.createdAt,
				syncStatus: r.syncStatus ?? 0,
				payload: r.payload,
				_source: 'memory',
			})) : [];

			const merged = [...aOut, ...memActions].sort((x, y) => {
				const tx = new Date(x.createdAt || 0).getTime();
				const ty = new Date(y.createdAt || 0).getTime();
				return ty - tx;
			});

			// Convert to history-like items when possible and keep raw actions for everything else
			const converted = merged.map(m => ({ ...m, __history: toHistoryItem(m) }));
			const hist = converted.filter((x: any) => x.__history !== null);
			const raw = converted.filter((x: any) => x.__history === null);
			setItems(hist);
			setRawActions(raw);
		} catch (e: any) {
			console.warn('load db error', e);
			setError(e?.message ?? String(e));
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	// 下拉刷新
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, []);

	const renderItem = ({ item, index }: { item: any; index: number }) => (
		<LocalGameCard
			item={item}
			index={index}
			onPress={(selectedItem) => {
				const h = selectedItem.__history;
				if (h) {
					(nav as any).navigate('GameDetail', { game: h, isLocal: true });
				}
			}}
		/>
	);

	if (loading) return (
		<LinearGradient
			colors={[color.background, color.lightBackground]}
			style={styles.loadingContainer}
		>
			<View style={styles.loadingContent}>
				<MaterialCommunityIcons name="database-sync" size={48} color={color.info} />
				<Text style={styles.loadingText}>正在加载本地数据库...</Text>
				<Text style={styles.loadingSubText}>读取本地存储的游戏记录</Text>
			</View>
		</LinearGradient>
	);

	if (!hasLocalDb) {
		return (
			<LinearGradient
				colors={[color.background, color.lightBackground]}
				style={styles.emptyContainer}
			>
				<View style={styles.emptyIconContainer}>
					<MaterialCommunityIcons name="database-off" size={64} color={color.mutedText} />
				</View>
				<Text style={styles.emptyText}>本地数据库不可用</Text>
				<Text style={styles.emptySubText}>
					本地数据库在当前运行环境不可用。{'\n'}
					请确保在模拟器/设备上使用原生运行。
				</Text>
				<TouchableOpacity 
					style={styles.emptyAction}
					onPress={() => load()}
					activeOpacity={0.7}
				>
					<LinearGradient
						colors={[color.info, '#7FB3D9']}
						style={styles.emptyActionGradient}
					>
						<MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
						<Text style={styles.emptyActionText}>重试</Text>
					</LinearGradient>
				</TouchableOpacity>
			</LinearGradient>
		);
	}

	return (
		<LinearGradient
			colors={[color.background, color.lightBackground]}
			style={styles.container}
		>
			{/* 页面头部 */}
			<LinearGradient
				colors={[color.primary, color.primary]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 0 }}
				style={localStyles.header}
			>
				<View style={localStyles.headerContent}>
					<View style={localStyles.headerLeft}>
						<MaterialCommunityIcons name="database" size={24} color={color.lightText} />
						<Text style={localStyles.headerTitle}>本地数据库</Text>
					</View>
					<View style={localStyles.headerRight}>
						<TouchableOpacity
							style={localStyles.headerButton}
							onPress={onRefresh}
							activeOpacity={0.7}
						>
							<MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
						</TouchableOpacity>
						{error && (
							<TouchableOpacity
								style={[localStyles.headerButton, { marginLeft: Spacing.xs }]}
								onPress={() => Alert.alert('错误详情', error)}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons name="alert-circle" size={20} color="#FFE57F" />
							</TouchableOpacity>
						)}
					</View>
				</View>
				
				{/* 统计信息 */}
				<View style={localStyles.statsRow}>
					<View style={localStyles.statChip}>
						<MaterialCommunityIcons name="file-document" size={16} color="rgba(255, 255, 255, 0.8)" />
						<Text style={localStyles.statChipText}>{items.length} 条记录</Text>
					</View>
					{rawActions.length > 0 && (
						<View style={[localStyles.statChip, { marginLeft: Spacing.sm }]}>
							<MaterialCommunityIcons name="database-cog" size={16} color="rgba(255, 255, 255, 0.8)" />
							<Text style={localStyles.statChipText}>{rawActions.length} 原始动作</Text>
						</View>
					)}
				</View>
			</LinearGradient>

			<FlatList
				data={items}
				keyExtractor={(item) => String(item.id)}
				contentContainerStyle={styles.list}
				renderItem={renderItem}
				refreshControl={
					<RefreshControl 
						refreshing={refreshing} 
						onRefresh={onRefresh}
						colors={[color.info]}
						tintColor={color.info}
					/>
				}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<LinearGradient
						colors={['rgba(255, 255, 255, 0.8)', 'rgba(248, 250, 251, 0.8)']}
						style={styles.emptyContainer}
					>
						<View style={styles.emptyIconContainer}>
							<MaterialCommunityIcons name="database-search" size={64} color={color.mutedText} />
						</View>
						<Text style={styles.emptyText}>暂无本地记录</Text>
						<Text style={styles.emptySubText}>
							完成一局游戏后，可在此查看本地快照。{'\n'}
							本地记录独立于云端数据存储。
						</Text>
						{error && (
							<View style={localStyles.errorContainer}>
								<MaterialCommunityIcons name="alert-circle-outline" size={20} color={color.error} />
								<Text style={localStyles.errorText}>{error}</Text>
								<TouchableOpacity
									style={localStyles.errorButton}
									onPress={() => load()}
									activeOpacity={0.7}
								>
									<Text style={localStyles.errorButtonText}>重新加载</Text>
								</TouchableOpacity>
							</View>
						)}
					</LinearGradient>
				}
			/>
		</LinearGradient>
	);
}

// DatabaseScreen 专用样式
const localStyles = {
	header: {
		paddingTop: 50, // 状态栏高度
		paddingBottom: Spacing.lg,
		paddingHorizontal: Spacing.lg,
	},
	headerContent: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		marginBottom: Spacing.md,
	},
	headerLeft: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
	},
	headerTitle: {
		fontSize: FontSize.h2,
		fontWeight: '700' as const,
		color: color.lightText,
		marginLeft: Spacing.sm,
	},
	headerRight: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center' as const,
		justifyContent: 'center' as const,
	},
	statsRow: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
	},
	statChip: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		paddingHorizontal: Spacing.sm,
		paddingVertical: Spacing.xs,
		borderRadius: Radius.md,
	},
	statChipText: {
		fontSize: FontSize.small,
		color: 'rgba(255, 255, 255, 0.9)',
		fontWeight: '600' as const,
		marginLeft: Spacing.xs,
	},
	errorContainer: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
		backgroundColor: 'rgba(244, 67, 54, 0.1)',
		padding: Spacing.md,
		borderRadius: Radius.md,
		marginTop: Spacing.lg,
		borderWidth: 1,
		borderColor: 'rgba(244, 67, 54, 0.3)',
	},
	errorText: {
		flex: 1,
		fontSize: FontSize.small,
		color: color.error,
		marginLeft: Spacing.sm,
		marginRight: Spacing.sm,
	},
	errorButton: {
		backgroundColor: color.error,
		paddingHorizontal: Spacing.sm,
		paddingVertical: Spacing.xs,
		borderRadius: Radius.sm,
	},
	errorButtonText: {
		fontSize: FontSize.small,
		color: color.lightText,
		fontWeight: '600' as const,
	},
};

