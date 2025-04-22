import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LogItem } from '@/stores/useLogStore';
import { useLogger } from '@/utils/useLogger';

type Props = {
    logs: LogItem[];
    onClose?: () => void;
};

export const LogViewer: React.FC<Props> = ({ logs, onClose: isClosed }) => {
    const { clearLogs } = useLogger();
    const [filterTag, setFilterTag] = useState<string | null>(null);

    const tags = useMemo(() => {
        const allTags = logs.map((log) => log.tag);
        return Array.from(new Set(allTags));
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return filterTag ? logs.filter((log) => log.tag === filterTag) : logs;
    }, [logs, filterTag]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🪵 德州日志</Text>
                <View style={styles.headerActions}>
                    {isClosed && (
                        <TouchableOpacity onPress={isClosed}>
                            <MaterialCommunityIcons name="close" size={24} color="#F44336" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>筛选标签：</Text>
                <TouchableOpacity onPress={() => setFilterTag(null)}>
                    <Text style={[styles.filterTag, !filterTag && styles.filterActive]}>全部</Text>
                </TouchableOpacity>
                {tags.map((tag) => (
                    <TouchableOpacity key={tag} onPress={() => setFilterTag(tag)}>
                        <Text style={[styles.filterTag, filterTag === tag && styles.filterActive]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredLogs}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <Text style={styles.logItem}>
                        <Text style={styles.emoji}>{item.emoji}</Text>{' '}
                        <Text style={styles.tag}>[{item.timestamp.toLocaleTimeString()}] [{item.tag}]</Text>{' '}
                        <Text>{item.message}</Text>
                    </Text>
                )}
                contentContainerStyle={styles.logList}
                showsVerticalScrollIndicator={false}
                inverted // 最新日志在底部，从下往上滑
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        height: 500,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 12,
        padding: 10,
        zIndex: 9999,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    clear: {
        color: '#ff7675',
        fontWeight: '600',
        fontSize: 13,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    filterLabel: {
        color: '#ccc',
        fontSize: 12,
        marginRight: 4,
    },
    filterTag: {
        fontSize: 12,
        color: '#b2bec3',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#2d3436',
    },
    filterActive: {
        backgroundColor: '#0984e3',
        color: '#fff',
    },
    logList: {
        paddingBottom: 4,
    },
    logItem: {
        color: '#dfe6e9',
        fontSize: 12,
        marginBottom: 4,
    },
    tag: {
        color: '#74b9ff',
    },
    emoji: {
        marginRight: 4,
    },
});
