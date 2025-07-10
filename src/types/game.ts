import { Timestamp } from "firebase/firestore";

export type GameStatus = 'idle' | 'ongoing' | 'finished';
export type GameState = {
    gameId: string;
    smallBlind: number;
    bigBlind: number;
    baseChipAmount: number;
    baseCashAmount: number;
    created: string | Timestamp;
    updated?: string | Timestamp;
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
        created: string | Timestamp;
        updated: string | Timestamp;
    }) => void;

    getGame: () => {
        gameId: string;
        baseChipAmount: number;
        baseCashAmount: number;
        created: string | Timestamp;
        updated: string | Timestamp;
        status: GameStatus;
    };

    finishGame: () => void;
    finalizeGame: () => void;
    resetGame: () => void;
};

export type PlayerSnapshot = {
    id: string;
    nickname: string;
    photoURL?: string | null;
    totalBuyInChips: number;
    buyInCount: number;
    endingChipCount: number;
    cashDifference: number;
    roiSum: number;
};

export type GameSnapshot = {
    id: string;
    smallBlind: number;
    bigBlind: number;
    baseCashAmount: number;
    baseChipAmount: number;
    totalBuyIn: number;
    totalEnding: number;
    totalDiff: number;
    created: string | Timestamp;
    updated: string | Timestamp;
    players: PlayerSnapshot[];
};

export type GameHistoryState = {
    history: GameSnapshot[];
    setHistory: (data: GameSnapshot[]) => void;
    addGameSnapshot: (snapshot: GameSnapshot) => void;
    clearHistory: () => void;
};

