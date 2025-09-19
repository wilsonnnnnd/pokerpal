import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Palette as color } from '@/constants';
import * as SQLite from 'expo-sqlite';
import { GameHistorystyles as styles } from '@/assets/styles';
import { useNavigation } from '@react-navigation/native';

const sqliteAny = SQLite as any;
const isSQLiteAvailable = Boolean(sqliteAny && (sqliteAny.openDatabase || sqliteAny.openDatabaseSync));
let db: any = null;
if (isSQLiteAvailable) {
	try {
		const openFn = sqliteAny.openDatabase || sqliteAny.openDatabaseSync;
		db = openFn('pokerpal.db');
	} catch (e) {
		console.warn('Failed to open DB', e);
		db = null;
	}
}

function execSql(sql: string, args: any[] = []): Promise<any> {
	if (!isSQLiteAvailable || !db) return Promise.reject(new Error('expo-sqlite not available'));
	return new Promise((resolve, reject) => {
		db.transaction((tx: any) => {
			tx.executeSql(sql, args, (_tx: any, res: any) => resolve(res), (_tx: any, err: any) => { reject(err); return false; });
		}, (txErr: any) => reject(txErr));
	});
}

export default function DatabaseScreen() {
	const [loading, setLoading] = useState(true);
	const [games, setGames] = useState<any[]>([]);
	const [history, setHistory] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const nav = useNavigation();

	const load = async () => {
		setError(null);
		setLoading(true);
		try {
			if (!isSQLiteAvailable || !db) {
				setGames([]);
				setHistory([]);
				setError('SQLite not available in this environment.');
				return;
			}

			await execSql(`CREATE TABLE IF NOT EXISTS games (
				id TEXT PRIMARY KEY,
				createdMs INTEGER,
				updatedMs INTEGER,
				data TEXT
			)`);

			await execSql(`CREATE TABLE IF NOT EXISTS history (
				id TEXT PRIMARY KEY,
				createdMs INTEGER,
				data TEXT
			)`);

			const gRes = await execSql(`SELECT id, createdMs, updatedMs, data FROM games ORDER BY updatedMs DESC`);
			const gOut: any[] = [];
			if (gRes && gRes.rows && Array.isArray(gRes.rows._array)) {
				for (const r of gRes.rows._array) {
					let parsed = null;
					try { parsed = r.data ? JSON.parse(r.data) : null; } catch (e) { console.warn('parse game', e); parsed = null; }
					gOut.push({ id: r.id, createdMs: r.createdMs, updatedMs: r.updatedMs, data: parsed });
				}
			} else {
				for (let i = 0; i < (gRes.rows.length ?? 0); i++) {
					const r = gRes.rows.item(i);
					let parsed = null;
					try { parsed = r.data ? JSON.parse(r.data) : null; } catch (e) { console.warn('parse game', e); parsed = null; }
					gOut.push({ id: r.id, createdMs: r.createdMs, updatedMs: r.updatedMs, data: parsed });
				}
			}

			const hRes = await execSql(`SELECT id, createdMs, data FROM history ORDER BY createdMs DESC`);
			const hOut: any[] = [];
			if (hRes && hRes.rows && Array.isArray(hRes.rows._array)) {
				for (const r of hRes.rows._array) {
					let parsed = null;
					try { parsed = r.data ? JSON.parse(r.data) : null; } catch (e) { console.warn('parse history', e); parsed = null; }
					hOut.push({ id: r.id, createdMs: r.createdMs, data: parsed });
				}
			} else {
				for (let i = 0; i < (hRes.rows.length ?? 0); i++) {
					const r = hRes.rows.item(i);
					let parsed = null;
					try { parsed = r.data ? JSON.parse(r.data) : null; } catch (e) { console.warn('parse history', e); parsed = null; }
					hOut.push({ id: r.id, createdMs: r.createdMs, data: parsed });
				}
			}

			setGames(gOut);
			setHistory(hOut);
		} catch (e: any) {
			console.warn('load db error', e);
			setError(e?.message ?? String(e));
			setGames([]);
			setHistory([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	const confirmDelete = (id: string) => {
		Alert.alert('删除游戏', '确定删除该本地游戏吗？此操作不可恢复。', [
			{ text: '取消', style: 'cancel' },
			{ text: '删除', style: 'destructive', onPress: async () => {
				try { if (isSQLiteAvailable && db) await execSql(`DELETE FROM games WHERE id = ?`, [id]); } catch (e) { console.warn('delete error', e); }
				await load();
			} }
		]);
	};

	if (loading) return (
		<View style={styles.loadingContainer}>
			<ActivityIndicator size="large" color={color.confirm} />
			<Text style={styles.loadingText}>正在加载本地数据库...</Text>
		</View>
	);

	if (!isSQLiteAvailable || !db) {
		return (
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
				<Text style={{ fontWeight: '700', marginBottom: 8 }}>本机 SQLite 未安装或不可用</Text>
				<Text style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>expo-sqlite 在当前运行环境不可用。请确保在模拟器/设备上安装或使用原生运行。</Text>
				<TouchableOpacity onPress={() => load()} style={{ padding: 8 }}>
					<Text style={{ color: color.info }}>重试</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={{ flex: 1, padding: 12 }}>
			<TouchableOpacity onPress={() => load()} style={{ marginBottom: 12 }}>
				<Text style={{ color: color.info }}>刷新</Text>
			</TouchableOpacity>

			{error && (
				<View style={{ padding: 8, backgroundColor: '#fee', borderRadius: 8, marginBottom: 12 }}>
					<Text style={{ color: color.error, fontWeight: '600' }}>错误: {error}</Text>
					<TouchableOpacity onPress={() => load()} style={{ marginTop: 8 }}>
						<Text style={{ color: color.info }}>重试</Text>
					</TouchableOpacity>
				</View>
			)}

			<Text style={{ fontWeight: '700', marginBottom: 8 }}>本地 Games ({games.length})</Text>
			<FlatList
				data={games}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity onPress={() => confirmDelete(item.id)} style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
						<Text style={{ fontWeight: '600' }}>{item.id}</Text>
						<Text>{new Date(item.updatedMs || item.createdMs || Date.now()).toLocaleString()}</Text>
					</TouchableOpacity>
				)}
				style={{ maxHeight: 240, marginBottom: 12 }}
			/>

			<Text style={{ fontWeight: '700', marginBottom: 8 }}>历史快照 ({history.length})</Text>
			<FlatList
				data={history}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<View style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }}>
						<Text style={{ fontWeight: '600' }}>{item.id}</Text>
						<Text>{new Date(item.createdMs || Date.now()).toLocaleString()}</Text>
						<Text numberOfLines={2} ellipsizeMode="tail">{JSON.stringify(item.data?.players?.slice(0,3) || [])}</Text>
					</View>
				)}
			/>
		</View>
	);
}

