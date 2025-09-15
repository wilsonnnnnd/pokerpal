export type PlayerLocal = {
    id: string; // uuid or generated id
    nickname: string;
    totalProfit: number; // cumulative cash
    averageROI: number; // total ROI sum (not divided)
    gamesPlayed: number;
    photoURL?: string;
    createdAt: string;
    updatedAt?: string;
};

export type GamePlayerEntry = {
    playerId: string;
    seat?: number; // optional seat index
    buyIn: number;
    chips?: number;
    isSB?: boolean;
    isBB?: boolean;
};

export type GameLocal = {
    id: string; // uuid
    createdAt: string;
    startedAt?: string;
    finishedAt?: string | null;
    players: GamePlayerEntry[];
    sbIndex?: number | null;
    bbIndex?: number | null;
    initialBuyIn: number;
    meta?: Record<string, any>;
};
