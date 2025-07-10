import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types';

export const useGameStore = create<GameState>()(
    devtools(
        persist(
            (set, get) => ({
                gameId: '',
                smallBlind: 0,
                bigBlind: 0,
                baseChipAmount: 0,
                baseCashAmount: 0,
                created: new Date().toISOString(),
                updated: undefined,
                finalized: false,
                token: null,
                setGame: ({ gameId, baseChipAmount, baseCashAmount, smallBlind, bigBlind }) =>
                    set({
                        gameId,
                        baseChipAmount,
                        baseCashAmount,
                        smallBlind,
                        bigBlind,
                        finalized: false,
                        created: new Date().toISOString(),
                    }),
                setToken: (token: string) => set({ token }),
                getGame: () => ({
                    gameId: get().gameId,
                    smallBlind: get().smallBlind,
                    bigBlind: get().bigBlind,
                    baseChipAmount: get().baseChipAmount,
                    baseCashAmount: get().baseCashAmount,

                }),

                finalizeGame: () => {
                    set({
                        finalized: true,
                        updated: new Date().toISOString(),
                    });
                },

                finishGame: () =>
                    set({
                        finalized: true,
                        updated: new Date().toISOString(),
                    }),

                resetGame: () =>
                    set({
                        gameId: '',
                        smallBlind: 0,
                        bigBlind: 0,
                        baseChipAmount: 0,
                        baseCashAmount: 0,
                        finalized: false,
                        token: null,
                    }),
            }),
            {
                name: 'game-storage',
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

                partialize: (state): GameState => ({
                    gameId: state.gameId,
                    smallBlind: state.smallBlind,
                    bigBlind: state.bigBlind,
                    baseChipAmount: state.baseChipAmount,
                    baseCashAmount: state.baseCashAmount,
                    created: state.created,
                    updated: state.updated,
                    finalized: state.finalized,
                    token: state.token,
                    setGame: state.setGame,
                    getGame: state.getGame,
                    finalizeGame: state.finalizeGame,
                    finishGame: state.finishGame,
                    resetGame: state.resetGame,
                    setToken: state.setToken,
                }),
            }
        ),
        {
            name: 'GameStore',
        }
    )
);
