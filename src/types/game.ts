export type GameStatus = 'idle' | 'ongoing' | 'finished';
export type GameState = {
    gameId: string;
    smallBlind: number;
    bigBlind: number;
    baseChipAmount: number;
    baseCashAmount: number;
    startTime: string | null;
    endTime: string | null; 
    status: GameStatus;
    finalized: boolean;
    token: string | null;
    setToken: (token: string) => void;
    setGame: (params: {
        gameId: string;
        smallBlind: number;
        bigBlind: number;
        baseChipAmount: number;
        baseCashAmount: number;
    }) => void;

    getGame: () => {
        gameId: string;
        baseChipAmount: number;
        baseCashAmount: number;
        startTime: string | null;
        endTime: string | null;
        status: GameStatus;
    };

    finishGame: () => void;
    finalizeGame: () => void;
    resetGame: () => void;
};

export type PlayerSnapshot = {
    id: string;
    nickname: string;
    totalBuyInChips: number;
    buyInCount: number;
    endingChipCount: number;
    chipDifference: number;
    cashDifference: number;
    roi: number;
};

export type GameSnapshot = {
    id: string;
    createdAt: string;
    smallBlind: number;
    bigBlind: number;
    baseCashAmount: number;
    baseChipAmount: number;
    totalBuyIn: number;
    totalEnding: number;
    totalDiff: number;
    players: PlayerSnapshot[];
};

export type GameHistoryState = {
    history: GameSnapshot[];
    setHistory: (data: GameSnapshot[]) => void;
    addGameSnapshot: (snapshot: GameSnapshot) => void;
    clearHistory: () => void;
};

