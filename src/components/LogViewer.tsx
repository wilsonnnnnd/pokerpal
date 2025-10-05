import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette } from '@/constants';
import { LogItem } from '@/stores/useLogStore';
import { useLogger } from '@/utils/useLogger';
import localDb from '@/services/localDb';
import { LogViewerStyles } from '@/assets/styles';

type Props = {
    logs: LogItem[];
    onClose?: () => void;
};

export const LogViewer: React.FC<Props> = ({ logs, onClose: isClosed }) => {
    const { clearLogs } = useLogger();
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [showDb, setShowDb] = useState(false);
    const [dbLogs, setDbLogs] = useState<any[]>([]);
    const [loadingDb, setLoadingDb] = useState(false);

    const tags = useMemo(() => {
        const allTags = logs.map((log) => log.tag);
        return Array.from(new Set(allTags));
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return filterTag ? logs.filter((log) => log.tag === filterTag) : logs;
    }, [logs, filterTag]);

    return (
        <View style={LogViewerStyles.container}>
            <View style={LogViewerStyles.header}>
                <Text style={LogViewerStyles.title}>🪵 德州日志</Text>
                <View style={LogViewerStyles.headerActions}>
                        <TouchableOpacity onPress={async () => {
                            // 切换 DB 模式；若切换为 true 则加载数据
                            if (!showDb) {
                                setLoadingDb(true);
                                try {
                                    const res = await localDb.execSql('SELECT * FROM actions ORDER BY createdAt DESC;');
                                    const rows = (res && res.rows && res.rows._array) ? res.rows._array : [];
                                    setDbLogs(rows);
                                } catch (e) {
                                    console.warn('加载本地 actions 失败', e);
                                    setDbLogs([]);
                                } finally {
                                    setLoadingDb(false);
                                }
                            }
                            setShowDb(!showDb);
                        }} style={{ marginRight: 12 }}>
                            <MaterialCommunityIcons name={showDb ? 'database-eye' : 'database'} size={24} color={Palette.info} />
                        </TouchableOpacity>
                        {isClosed && (
                            <TouchableOpacity onPress={isClosed}>
                                <MaterialCommunityIcons name="close" size={24} color={Palette.error} />
                            </TouchableOpacity>
                        )}
                </View>
            </View>

            <View style={LogViewerStyles.filterRow}>
                <Text style={LogViewerStyles.filterLabel}>筛选标签：</Text>
                <TouchableOpacity onPress={() => setFilterTag(null)}>
                    <Text style={[LogViewerStyles.filterTag, !filterTag && LogViewerStyles.filterActive]}>全部</Text>
                </TouchableOpacity>
                {tags.map((tag) => (
                    <TouchableOpacity key={tag} onPress={() => setFilterTag(tag)}>
                        <Text style={[LogViewerStyles.filterTag, filterTag === tag && LogViewerStyles.filterActive]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {showDb ? (
                <FlatList
                    data={dbLogs}
                    keyExtractor={(item, idx) => String(item.id ?? idx)}
                    renderItem={({ item }) => {
                        let payload = item.payload;
                        try {
                            if (typeof payload === 'string') payload = JSON.parse(payload);
                        } catch (e) {
                            // ignore parse error
                        }
                        return (
                            <View style={{ marginBottom: 8 }}>
                                <Text style={LogViewerStyles.logItem}>
                                    <Text style={LogViewerStyles.tag}>[{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}]</Text>{' '}
                                    <Text style={{ fontWeight: '700' }}>{item.type}</Text>{' '}
                                    <Text>{typeof payload === 'object' ? JSON.stringify(payload) : String(payload)}</Text>
                                </Text>
                            </View>
                        );
                    }}
                    contentContainerStyle={LogViewerStyles.logList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={{ color: Palette.loadingText }}> {loadingDb ? '加载中...' : '无本地记录'} </Text>}
                />
            ) : (
                <FlatList
                    data={filteredLogs}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <Text style={LogViewerStyles.logItem}>
                            <Text style={LogViewerStyles.emoji}>{item.emoji}</Text>{' '}
                            <Text style={LogViewerStyles.tag}>[{item.timestamp.toLocaleTimeString()}] [{item.tag}]</Text>{' '}
                            <Text>{item.message}</Text>
                        </Text>
                    )}
                    contentContainerStyle={LogViewerStyles.logList}
                    showsVerticalScrollIndicator={false}
                    inverted // 最新日志在底部，从下往上滑
                />
            )}
        </View>
    );
};

