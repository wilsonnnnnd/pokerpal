// src/stores/useGameStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, GameDocFS } from '@/types';


export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        gameId: '',
        smallBlind: 0,
        bigBlind: 0,
        baseChipAmount: 0,
        baseCashAmount: 0,

        created: null,     // ✅ 统一 null
        updated: null,     // ✅ 统一 null

        finalized: false,
        token: null,

        // 初始化/更新本地新游戏（本地写 createdMs）
        setGame: ({ gameId, baseChipAmount, baseCashAmount, smallBlind, bigBlind }) =>
          set({
            gameId,
            baseChipAmount,
            baseCashAmount,
            smallBlind,
            bigBlind,
            created: new Date().toISOString(),
            updated: null,
            finalized: false,
          }),

        // 从 Firestore 文档写入（以远端为准）
        setFromFirestore: (doc: Partial<GameDocFS> & { gameId: string }) =>
          set((prev) => ({
            ...prev,
            gameId: doc.gameId,
            smallBlind: Number(doc.smallBlind ?? prev.smallBlind ?? 0),
            bigBlind: Number(doc.bigBlind ?? prev.bigBlind ?? 0),
            baseChipAmount: Number(doc.baseChipAmount ?? prev.baseChipAmount ?? 0),
            baseCashAmount: Number(doc.baseCashAmount ?? prev.baseCashAmount ?? 0),
            created: doc.created,
            updated: doc.updated,
            finalized: Boolean(doc.finalized ?? prev.finalized ?? false),
            token: (doc.token ?? prev.token ?? null) as string | null,
          })),

        setToken: (token: string | null) => set({ token }),

        getGame: () => ({
          gameId: get().gameId,
          baseChipAmount: get().baseChipAmount,
          baseCashAmount: get().baseCashAmount,
        }),


        // 结束/结算：只更新本地状态；真正写 Firestore 在你的业务层完成
        finalizeGame: () =>
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
            created: null,
            updated: null,
            finalized: false,
            token: null,
          }),
      }),
      {
        name: 'game-storage',
        storage: {
          getItem: async (name) => {
            const v = await AsyncStorage.getItem(name);
            return v ? JSON.parse(v) : null;
          },
          setItem: async (name, value) => {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name) => {
            await AsyncStorage.removeItem(name);
          },
        },
        // ✅ 仅持久化数据字段，避免把函数序列化到存储里
        partialize: (state: GameState): Partial<GameState> => ({
          gameId: state.gameId,
          smallBlind: state.smallBlind,
          bigBlind: state.bigBlind,
          baseChipAmount: state.baseChipAmount,
          baseCashAmount: state.baseCashAmount,
          created: state.created,
          updated: state.updated,
          finalized: state.finalized,
          token: state.token,
        }),
        version: 2,
        migrate: async (persistedState: any, version) => {
          // 简单迁移：把 undefined 的 updated 迁移为 null
          if (version < 2 && persistedState?.state) {
            if (persistedState.state.updated === undefined) {
              persistedState.state.updated = null;
            }
          }
          return persistedState;
        },
      }
    ),
    { name: 'GameStore' }
  )
);
