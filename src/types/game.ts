// ===== 子集合 players（现金口径）=====
export type PlayerSnapshotCash = {
  playerId: string;
  nickname: string;
  totalBuyInCash: number;   // 现金总买入
  settleCashAmount: number; // 结算现金
  settleCashDiff: number;   // 盈亏（正盈利，负亏损）
  settleROI: number;        // 小数，例如 0.2 表示 20%
  buyInCount: number;
  photoUrl?: string | null; // ✅ 统一为 photoUrl
};

// ===== Game 主文档（以 Firestore 为准）=====
export type GameDocFS = {
  gameId: string;            // 通常与 docId 相同
  smallBlind?: number;
  bigBlind?: number;
  baseCashAmount?: number;
  baseChipAmount?: number;
  rate?: number;             // 可选汇率（如有）
  playerCount?: number;
  status?: string;           // "finalized" 等
  finalized?: boolean;
  createdBy?: string | null;
  token?: string | null;
  created?: string;          // ISO string
  updated?: string;          // ISO string
};

// ===== 归一化给 UI 使用 =====
export type GameSnapshotUI = {
  id: string;                 // = gameId / docId
  smallBlind?: number;
  bigBlind?: number;
  rate?: number;
  created: string;          // ISO string
  updated: string;          // ISO string
  totalBuyInCash: number;     // Σ totalBuyInCash
  totalEndingCash: number;    // Σ settleCashAmount
  totalDiffCash: number;      // Σ settleCashDiff
  players: PlayerSnapshotCash[];
};

// ===== 排行列表条目（只保留现金口径）=====
export type PlayerItem = {
  id: string;                 // = playerId
  nickname: string;
  photoUrl?: string | null;
  buyInCount: number;
  totalBuyInCash: number;
  settleCashAmount: number;
  settleCashDiff: number;     // 正盈利 负亏损
  settleROI: number;          // 小数，例如 0.2 => 20%
};

export type GameHistoryItem = {
  id: string;                 // = gameId
  smallBlind?: number;
  bigBlind?: number;
  created: string;
  updated: string;
  
  totalBuyInCash: number;     // Σ totalBuyInCash
  totalEndingCash: number;    // Σ settleCashAmount
  totalDiffCash: number;      // Σ settleCashDiff
  players: PlayerItem[];
};

// Zustand store shape for game history persistence
export type GameHistoryState = {
  history: GameHistoryItem[];
  setHistory: (data: GameHistoryItem[]) => void;
  addGameSnapshot: (snapshot: GameHistoryItem) => void;
  clearHistory: () => void;
};

// ====== GameState（给 useGameStore 用）======
export type GameState = {
  gameId: string;
  smallBlind: number;
  bigBlind: number;
  baseChipAmount: number;
  baseCashAmount: number;

  created: string | null;   // ISO string or null
  updated: string | null;   // ISO string or null

  finalized: boolean;
  token: string | null;

  // actions
  setGame: (args: {
    gameId: string;
    baseChipAmount: number;
    baseCashAmount: number;
    smallBlind: number;
    bigBlind: number;
    rate?: number;
  }) => void;

  setToken: (token: string | null) => void;

  setFromFirestore: (doc: Partial<GameDocFS> & { gameId: string }) => void;

  getGame: () => {
    gameId: string;
    baseChipAmount: number;
    baseCashAmount: number;
  };

  finalizeGame: () => void;
  resetGame: () => void;
};
