import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Palette as color } from '@/constants';
import localDb, { isSQLiteAvailable } from '@/services/localDb';
import { GameHistorystyles as styles } from '@/assets/styles';
import { useNavigation } from '@react-navigation/native';

export default function DatabaseScreen() {
    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const nav = useNavigation();

    const load = async () => {
        setLoading(true);
        try {
            if (!isSQLiteAvailable) {
                setGames([]);
                setHistory([]);
                return;
            }
            const g = await localDb.listGamesLocal();
            const h = await localDb.listHistoryLocal();
            setGames(g);
            setHistory(h);
        } catch (e) {
            console.warn('load db error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const confirmDelete = (id: string) => {
        Alert.alert('删除游戏', '确定删除该本地游戏吗？此操作不可恢复。', [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: async () => { await localDb.deleteGameLocal(id); await load(); } }
        ]);
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color.confirm} />
            <Text style={styles.loadingText}>正在加载本地数据库...</Text>
        </View>
    );

    if (!isSQLiteAvailable) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>本机 SQLite 未安装</Text>
                <Text style={{ color: '#666', textAlign: 'center' }}>expo-sqlite 在当前运行环境不可用。请确保已安装并在模拟器/设备上重建应用，或在 web 环境使用替代存储。</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, padding: 12 }}>
            <TouchableOpacity onPress={() => load()} style={{ marginBottom: 12 }}>
                <Text style={{ color: color.info }}>刷新</Text>
            </TouchableOpacity>

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
