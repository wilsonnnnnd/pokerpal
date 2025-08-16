// src/stores/useGameStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, GameDocFS } from '@/types';
import { Timestamp } from 'firebase/firestore';

// 工具：宽松时间转毫秒
const tsToMs = (v: any): number | null => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (typeof v === 'number') return v;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        gameId: '',
        smallBlind: 0,
        bigBlind: 0,
        baseChipAmount: 0,
        baseCashAmount: 0,

        createdMs: null,     // ✅ 统一 null
        updatedMs: null,     // ✅ 统一 null

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
            createdMs: Date.now(),
            updatedMs: null,
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
            createdMs: tsToMs(doc.created) ?? prev.createdMs ?? Date.now(),
            updatedMs: tsToMs(doc.updated) ?? prev.updatedMs ?? null,
            finalized: Boolean(doc.finalized ?? prev.finalized ?? false),
            token: (doc.token ?? prev.token ?? null) as string | null,
          })),

        setToken: (token: string | null) => set({ token }),

        getGame: () => ({
          gameId: get().gameId,
          baseChipAmount: get().baseChipAmount,
          baseCashAmount: get().baseCashAmount,
        }),

        getCreatedTs: () => {
          const ms = get().createdMs;
          return typeof ms === 'number' ? Timestamp.fromMillis(ms) : null;
        },

        getUpdatedTs: () => {
          const ms = get().updatedMs;
          return typeof ms === 'number' ? Timestamp.fromMillis(ms) : null;
        },

        // 结束/结算：只更新本地状态；真正写 Firestore 在你的业务层完成
        finalizeGame: () =>
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
            updatedMs: null,
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
          createdMs: state.createdMs,
          updatedMs: state.updatedMs,
          finalized: state.finalized,
          token: state.token,
        }),
        version: 2,
        migrate: async (persistedState: any, version) => {
          // 简单迁移：把 undefined 的 updatedMs 迁移为 null
          if (version < 2 && persistedState?.state) {
            if (persistedState.state.updatedMs === undefined) {
              persistedState.state.updatedMs = null;
            }
          }
          return persistedState;
        },
      }
    ),
    { name: 'GameStore' }
  )
);
