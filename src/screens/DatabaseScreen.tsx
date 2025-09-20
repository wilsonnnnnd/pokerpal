import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Palette as color } from '@/constants';
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

export default function DatabaseScreen() {
	const [loading, setLoading] = useState(true);
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

	const renderItem = ({ item }: { item: any }) => {
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

			const onPress = () => {
				// navigate to GameDetail and pass the snapshot as `game` (GameDetail prefers firestore but also accepts snapshot)
				// include `isLocal` marker so GameDetail won't attempt Firestore reads
				(nav as any).navigate('GameDetail', { game: h, isLocal: true });
			};

		return (
			<TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
				<View style={styles.dateContainer}>
					<View style={styles.dateBox}>
						<Text style={styles.dateText}>{String(new Date(h.created).getDate()).padStart(2, '0')}</Text>
						<Text style={styles.monthText}>{String(new Date(h.created).getMonth() + 1).padStart(2, '0')}</Text>
						<Text style={styles.yearText}>{String(new Date(h.created).getFullYear())}</Text>
					</View>
					<Text style={styles.timeText}>{String(new Date(h.created).getHours()).padStart(2, '0')}:{String(new Date(h.created).getMinutes()).padStart(2, '0')}</Text>
				</View>

				<View style={styles.cardContent}>
					<View style={styles.cardHeader}>
						<View style={styles.blindsContainer}>
							<MaterialCommunityIcons name="poker-chip" size={20} color={color.highLighter || '#d46613'} />
							<Text style={styles.blindsText}>{h.smallBlind}/{h.bigBlind}</Text>
						</View>
						<View style={styles.playerCountContainer}>
							<Text style={styles.playerCountText}>{h.players.length}人参与</Text>
						</View>
					</View>

					<View style={styles.statsContainer}>
						<View style={styles.statItem}>
							<MaterialCommunityIcons name="bank" size={18} color={color.highLighter || '#d46613'} />
							<View style={styles.statTexts}>
								<Text style={styles.statValue}>{Number(h.totalBuyInCash).toFixed(0)}</Text>
								<Text style={styles.statLabel}>总买入筹码</Text>
							</View>
						</View>

						<View style={styles.statItem}>
							<MaterialCommunityIcons name="calculator-variant" size={18} color={color.highLighter || '#d46613'} />
							<View style={styles.statTexts}>
								<Text style={styles.statValue}>{Number(h.totalEndingCash).toFixed(0)}</Text>
								<Text style={styles.statLabel}>结算筹码</Text>
							</View>
						</View>

						<View style={styles.statItem}>
							<MaterialCommunityIcons
								name={h.totalDiffCash >= 0 ? 'arrow-up-bold-circle' : 'arrow-down-bold-circle'}
								size={18}
								color={h.totalDiffCash >= 0 ? color.success : color.error}
							/>
							<View style={styles.statTexts}>
								<Text style={[styles.statValue, { color: h.totalDiffCash >= 0 ? color.success : color.error }]}>
									{h.totalDiffCash >= 0 ? '+' : '-'}{Math.abs(Number(h.totalDiffCash)).toFixed(0)}
								</Text>
								<Text style={styles.statLabel}>总差额</Text>
							</View>
						</View>
					</View>

					{winner && loser && (
						<View style={styles.playersContainer}>
							<View style={styles.playerRow}>
								<View style={styles.playerInfo}>
									<MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
									<Text style={styles.playerName}>{winner.nickname}</Text>
								</View>
								<Text style={[styles.playerProfit, { color: color.success }]}>+${Number(winner.settleCashDiff).toFixed(0)}</Text>
							</View>

							<View style={styles.playerRow}>
								<View style={styles.playerInfo}>
									<MaterialCommunityIcons name="emoticon-sad" size={16} color="#9E9E9E" />
									<Text style={styles.playerName}>{loser.nickname}</Text>
								</View>
								<Text style={[styles.playerProfit, { color: color.error }]}>-${Math.abs(Number(loser.settleCashDiff)).toFixed(0)}</Text>
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

	if (loading) return (
		<View style={styles.loadingContainer}>
			<ActivityIndicator size="large" color={color.confirm} />
			<Text style={styles.loadingText}>正在加载本地数据库...</Text>
		</View>
	);

	if (!hasLocalDb) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
				<Text style={{ fontWeight: '700', marginBottom: 8 }}>本地数据库不可用</Text>
				<Text style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>本地数据库在当前运行环境不可用。请确保在模拟器/设备上使用原生运行。</Text>
				<TouchableOpacity onPress={() => load()} style={{ padding: 8 }}>
					<Text style={{ color: color.info }}>重试</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={items}
				keyExtractor={(item) => String(item.id)}
				contentContainerStyle={styles.list}
				renderItem={renderItem}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<MaterialCommunityIcons name="cards" size={60} color="#BDBDBD" />
						<Text style={styles.emptyText}>暂无本地记录</Text>
						<Text style={styles.emptySubText}>完成一局游戏后，可在此查看本地快照。</Text>
					</View>
				}
			/>

			
		</View>
	);
}

