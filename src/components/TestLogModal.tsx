import React from 'react';
import { Modal, View, TouchableOpacity, Text } from 'react-native';
import { useLogger } from '@/utils/useLogger';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGameStore } from '@/stores/useGameStore';
import { LogViewerStyles } from '@/assets/styles';
import { Palette } from '@/constants';
import { FlatList } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
};

export const TestLogModal: React.FC<Props> = ({ visible, onClose }) => {
    const { logs, log, clearLogs } = useLogger();

    const captureState = () => {
        const players = usePlayerStore.getState().players;
        const game = useGameStore.getState();
        log('State', { capturedAt: new Date().toISOString(), players, game });
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[LogViewerStyles.container, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                <View style={LogViewerStyles.header}>
                    <Text style={LogViewerStyles.title}>Test / Logs</Text>
                    <View style={LogViewerStyles.headerActions}>
                        <TouchableOpacity onPress={captureState} style={{ marginRight: 12 }}>
                            <Text style={{ color: Palette.info }}>Capture state</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={clearLogs} style={{ marginRight: 12 }}>
                            <Text style={{ color: Palette.warning }}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={{ color: Palette.error }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <Text style={LogViewerStyles.logItem}>
                            <Text style={LogViewerStyles.emoji}>{item.emoji}</Text>{' '}
                            <Text style={LogViewerStyles.tag}>[{item.timestamp.toLocaleTimeString()}] [{item.tag}]</Text>{' '}
                            <Text>{item.message}</Text>
                        </Text>
                    )}
                    contentContainerStyle={LogViewerStyles.logList}
                    showsVerticalScrollIndicator={false}
                    inverted
                />
            </View>
        </Modal>
    );
};

export default TestLogModal;
