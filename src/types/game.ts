/** ========================

 * ======================== */
// 子集合 players 的结构（以你截图为准）
export type PlayerSnapshotCash = {
    playerId: string;
    nickname: string;
    totalBuyInCash: number;
    settleCashAmount: number;
    settleCashDiff: number;
    settleROI: number;
    buyInCount: number;
    photoUrl?: string | null;
};

// Game 主文档（以 Firestore 为准）
export type GameDocFS = {
    gameId: string;           // 文档里的 gameId（通常与 docId 相同）
    smallBlind?: number;
    bigBlind?: number;
    baseCashAmount?: number;
    baseChipAmount?: number;
    rate?: number;
    playerCount?: number;
    status?: string;          // e.g. "finalized"
    finalized?: boolean;
    createdBy?: string | null;
    token?: string;
    created: any;             // Firestore Timestamp 或毫秒
    updated: any;             // Firestore Timestamp 或毫秒
};

// 归一化后给 UI 使用
export type GameSnapshotUI = {
    id: string;                 // = gameId / docId
    smallBlind?: number;
    bigBlind?: number;
    rate?: number;
    createdMs: number;
    updatedMs: number;
    totalBuyInCash: number;     // Σ totalBuyInCash
    totalEndingCash: number;    // Σ settleCashAmount
    totalDiffCash: number;      // Σ settleCashDiff
    players: PlayerSnapshotCash[];
};

// ---- 类型：只保留口径 ----
export type PlayerItem = {
    id: string;                // = playerId
    nickname: string;
    photoUrl?: string | null;
    buyInCount: number;
    totalBuyInCash: number;
    settleCashAmount: number;
    settleCashDiff: number;    // 正盈利 负亏损
    settleROI: number;         // 小数，例如 0.2 => 20%
};

export type GameHistoryItem = {
    id: string;                // = gameId
    smallBlind?: number;
    bigBlind?: number;
    createdMs: number;
    updatedMs: number;
    totalBuyInCash: number;    // Σ totalBuyInCash
    totalEndingCash: number;   // Σ settleCashAmount
    totalDiffCash: number;     // Σ settleCashDiff
    players: PlayerItem[];
};