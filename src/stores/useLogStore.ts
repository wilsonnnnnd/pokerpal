import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type LogItem = {
    id: string;
    tag: string;
    emoji: string;
    message: string;
    timestamp: Date;
};

const emojiMap: Record<string, string> = {
    Game: '🎮',
    Player: '🧑‍🤝‍🧑',
    Storage: '💾',
    Debug: '🐞',
    Error: '❌',
    Network: '🌐',
    UI: '🎨',
    State: '🧠',
    Time: '⏱️',
    Default: '📌',
};

type LogStore = {
    logs: LogItem[];
    log: (tag: string, message: string | object) => void;
    clearLogs: () => void;
    getLogsByTag: (tag: string) => LogItem[];
    exportLogsAsText: () => string;
};

export const useLogStore = create<LogStore>()(
    persist(
        (set, get) => ({
            logs: [],

            log: (tag, message) => {
                const time = new Date();
                const emoji = emojiMap[tag] || emojiMap.Default;
                const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message, null, 2);

                const newLog: LogItem = {
                    id: uuidv4(),
                    tag,
                    emoji,
                    message: formattedMessage,
                    timestamp: time,
                };

                set((state) => ({
                    logs: [newLog, ...state.logs.slice(0, 100)],
                }));


            },

            clearLogs: () => set({ logs: [] }),

            getLogsByTag: (tag: string) => get().logs.filter((log) => log.tag === tag),

            exportLogsAsText: () => {
                return get().logs.map(log =>
                    `[${log.timestamp.toLocaleTimeString()}] [${log.emoji} ${log.tag}] ${log.message}`
                ).join('\n');
            },
        }),
        {
            name: 'log-storage',
            storage: {
                getItem: async (name) => {
                    const value = await AsyncStorage.getItem(name);
                    return value ? JSON.parse(value) : null;
                },
                setItem: async (name, value) => {
                    await AsyncStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: async (name) => {
                    await AsyncStorage.removeItem(name);
                },
            },
            partialize: (state) => ({
                logs: state.logs,
                log: () => {},
                clearLogs: () => {},
                getLogsByTag: () => [],
                exportLogsAsText: () => '',
            }),
            merge: (persistedState, currentState) => ({
                ...currentState,
                ...(typeof persistedState === 'object' && persistedState !== null ? persistedState : {}),
                logs: (persistedState as any).logs.map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp),
                })),
            }),
        }
    )
);