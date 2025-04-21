
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameHistoryState } from '@/types';

export const useGameHistoryStore = create<GameHistoryState>()(
    persist(
        (set) => ({
            history: [],
            setHistory: (data) => set({ history: data }),
            addGameSnapshot: (snapshot) =>
                set((state) => ({
                    history: [snapshot, ...state.history],
                })),
            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'game-history',
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
        }
    )
);
