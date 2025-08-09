import { FieldValue, Timestamp } from "firebase/firestore";

export type Player = {
    id: string;
    nickname: string;
    email?: string;
    photoURL?: string;
    isActive?: boolean;
    joinAt: string | Timestamp | FieldValue; // 使用 Firestore 的时间戳类型
    buyInChipsList: number[];
    totalBuyInChips: number;
    endCashAmount?: number;
    settleChipCount?: number;       // 结算时筹码
    settleChipDiff?: number;        // 筹码盈亏
    settleCashDiff?: number;        // 现金盈亏
    settleCashAmount?: number;      // 结算时对应的现金值
    settleROI?: number;             // 投资回报率
    finalized?: boolean;
    isSyncing: boolean;
};

export type PlayerState = {
    players: Player[];
    isSyncing: boolean;
    addPlayer: (player: Player) => void;
    addBuyIn: (playerId: string, amount: number) => void;
    setFinalChips: (id: string, chips: number | null) => void;
    setEndingChips: (playerId: string, chipCount: number) => void;
    markPlayerLeft: (id: string) => void;
    markPlayerReturned: (id: string) => void;
    removePlayer: (id: string) => void;
    updatePlayer: (id: string, player: Partial<Player>) => void;
    setSyncing: (syncing: boolean) => void;
    mergePlayers: (remotePlayers: Player[]) => void;
    areAllPlayersFinalized: () => boolean;
    resetPlayers: () => void;
};
