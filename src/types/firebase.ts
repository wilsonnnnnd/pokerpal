const SORT_OPTIONS = ['totalCash', 'roi', 'appearances'] as const;
export type SortType = typeof SORT_OPTIONS[number];

export type FirebasePlayer = {
    nickname?: string;
    totalProfit?: number;
    totalCash?: number;
    // roiSum: accumulated weighted ROI (totalProfit / totalBuyInCash), stored as a ratio (e.g. 0.2 => 20%)
    roiSum?: number;
    gamesPlayed?: number;
    photoURL?: string;
};

export type AggregatedPlayer = {
    id: string;
    nickname: string;
    totalProfit: number;
    roiSum: number;
    gamesPlayed: number;
    photoURL?: string;
};
