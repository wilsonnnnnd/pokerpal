import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from './useGameStore';
import { Player, PlayerState } from '@/types';

export const usePlayerStore = create<PlayerState>()(
    devtools(
        persist(
            (set, get) => ({
                players: [],
                isSyncing: false,

                addPlayer: (player) =>
                    set((state) => ({
                        players: [...state.players, player],
                    })),

                addBuyIn: (id, amount) =>
                    set((state) => {
                        const { baseCashAmount, baseChipAmount } = useGameStore.getState();
                        const rate = baseChipAmount ? baseCashAmount / baseChipAmount : 0;

                        return {
                            players: state.players.map((p) =>
                                p.id === id
                                    ? {
                                        ...p,
                                        buyInChipsList: [...p.buyInChipsList, amount],
                                        totalBuyInChips: p.totalBuyInChips + amount,
                                        totalBuyInCash: Number(((p.totalBuyInCash || 0) + amount * rate).toFixed(2)),
                                    }
                                    : p
                            ),
                        };
                    }),

                setFinalChips: (id, chips) => {
                    if (chips === null) {
                        set((state) => ({
                            players: state.players.map((p) =>
                                p.id === id
                                    ? {
                                        ...p,
                                        settleChipCount: undefined,
                                        settleChipDiff: undefined,
                                        settleCashDiff: undefined,
                                        settleCashAmount: undefined,
                                        settleROI: undefined,
                                        finalized: false,
                                    }
                                    : p
                            ),
                        }));
                    } else {
                        get().setEndingChips(id, chips);
                    }
                },

                setEndingChips: (id, settleChipCount) =>
                    set((state) => {
                        const { baseCashAmount, baseChipAmount } = useGameStore.getState();
                        // Guard against division by zero: if baseChipAmount is 0, rate should be 0
                        const rate = baseChipAmount ? baseCashAmount / baseChipAmount : 0;

                        return {
                            players: state.players.map((p) => {
                                if (p.id !== id) return p;

                                const settleChipDiff = settleChipCount - p.totalBuyInChips;
                                const settleCashAmount = Number((settleChipCount * rate).toFixed(2));
                                const settleCashDiff = Number((settleChipDiff * rate).toFixed(2));

                                const denom = (p.totalBuyInChips * rate) || 0;
                                const settleROI = denom ? Number((settleCashDiff / denom).toFixed(6)) : 0;

                                return {
                                    ...p,
                                    settleChipCount,
                                    settleChipDiff,
                                    settleCashDiff,
                                    settleCashAmount,
                                    settleROI,
                                    finalized: true,
                                };
                            }),
                        };
                    }),

                markPlayerLeft: (id) =>
                    set((state) => ({
                        players: state.players.map((p) =>
                            p.id === id ? { ...p, isActive: false } : p
                        ),
                    })),

                markPlayerReturned: (id) =>
                    set((state) => ({
                        players: state.players.map((p) =>
                            p.id === id ? { ...p, isActive: true } : p
                        ),
                    })),

                removePlayer: (id) =>
                    set((state) => ({
                        players: state.players.filter((p) => p.id !== id),
                    })),

                updatePlayer: (id, partial) =>
                    set((state) => ({
                        players: state.players.map((p) =>
                            p.id === id ? { ...p, ...partial } : p
                        ),
                    })),

                resetPlayers: () => set({ players: [] }),

                setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),

                mergePlayers: (remotePlayers) =>
                    set((state) => {
                        const updated = [...state.players];
                
                        for (const remote of remotePlayers) {
                            const existingIndex = updated.findIndex(
                                (p) => p.email && remote.email && p.email === remote.email
                            );
                
                            if (existingIndex !== -1) {
                                const existing = updated[existingIndex];
                                updated[existingIndex] = {
                                    ...existing,
                                    ...remote,
                                    id: remote.id, // ✅ 强制使用远端 ID
                                    isActive: true,
                                };
                            } else {
                                updated.push({
                                    ...remote,
                                    id: remote.id, // ✅ 使用远端 ID
                                    isActive: true,
                                });
                            }
                        }
                
                        return { players: updated };
                    }),
                

                areAllPlayersFinalized: () => {
                    const players = get().players;
                    return players.length > 0 && players.every((p) => p.finalized);
                },
            }),
            {
                name: 'player-storage',
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
                onRehydrateStorage: () => {
                    return (state) => {
                        if (state?.players) {
                            state.players = state.players.map((p) => ({
                                ...p,
                                joinAt: new Date(p.joinAt).toISOString(),
                            }));
                        }
                    };
                },
                partialize: (state): PlayerState => ({
                    players: state.players || [],
                    isSyncing: state.isSyncing || false,
                    addPlayer: state.addPlayer,
                    addBuyIn: state.addBuyIn,
                    setFinalChips: state.setFinalChips,
                    setEndingChips: state.setEndingChips,
                    markPlayerLeft: state.markPlayerLeft,
                    markPlayerReturned: state.markPlayerReturned,
                    resetPlayers: state.resetPlayers,
                    removePlayer: state.removePlayer,
                    updatePlayer: state.updatePlayer,
                    setSyncing: state.setSyncing,
                    mergePlayers: state.mergePlayers,
                    areAllPlayersFinalized: state.areAllPlayersFinalized,
                }),
            }
        ),
        {
            name: 'PlayerStore',
        }
    )
);
