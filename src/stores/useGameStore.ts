// src/stores/useGameStore.ts
// ==========================
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '@/types';
import { Timestamp } from 'firebase/firestore'; // 仅用于 getCreatedTs/getUpdatedTs 转换

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        gameId: '',
        smallBlind: 0,
        bigBlind: 0,
        baseChipAmount: 0,
        baseCashAmount: 0,

        // ✅ 本地毫秒数，初始为空
        createdMs: null,
        updatedMs: undefined,

        finalized: false,
        token: null,

        // 设置游戏基本信息（内部写 createdMs）
        setGame: ({ gameId, baseChipAmount, baseCashAmount, smallBlind, bigBlind }) =>
          set({
            gameId,
            baseChipAmount,
            baseCashAmount,
            smallBlind,
            bigBlind,
            finalized: false,
            createdMs: Date.now(),   // ✅ 本地时间（毫秒）
            updatedMs: undefined,
          }),

        setToken: (token: string) => set({ token }),

        getGame: () => ({
          gameId: get().gameId,
          baseChipAmount: get().baseChipAmount,
          baseCashAmount: get().baseCashAmount,
        }),

        // ✅ 便捷转换：按需生成 Firestore Timestamp
        getCreatedTs: () => {
          const ms = get().createdMs;
          return ms ? Timestamp.fromMillis(ms) : null;
        },
        getUpdatedTs: () => {
          const ms = get().updatedMs;
          return ms ? Timestamp.fromMillis(ms) : null;
        },

        finalizeGame: () =>
          set({
            finalized: true,
            updatedMs: Date.now(),
          }),

        finishGame: () =>
          set({
            finalized: true,
            updatedMs: Date.now(),
          }),

        resetGame: () =>
          set({
            gameId: '',
            smallBlind: 0,
            bigBlind: 0,
            baseChipAmount: 0,
            baseCashAmount: 0,
            createdMs: null,
            updatedMs: undefined,
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
        // 只持久化必要字段（方法引用也可持久化为占位）
        partialize: (state): GameState => ({
          gameId: state.gameId,
          smallBlind: state.smallBlind,
          bigBlind: state.bigBlind,
          baseChipAmount: state.baseChipAmount,
          baseCashAmount: state.baseCashAmount,
          createdMs: state.createdMs,
          updatedMs: state.updatedMs,
          finalized: state.finalized,
          token: state.token,

          setGame: state.setGame,
          getGame: state.getGame,
          getCreatedTs: state.getCreatedTs,
          getUpdatedTs: state.getUpdatedTs,
          finalizeGame: state.finalizeGame,
          finishGame: state.finishGame,
          resetGame: state.resetGame,
          setToken: state.setToken,
        }),
      }
    ),
    { name: 'GameStore' }
  )
);
