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

// Firestore 存储的用户档案类型（用于 /users 文档）
export type FirestoreUserProfile = {
    nickname?: string;
    email?: string;
    photoURL?: string;
    role?: string;
    isActive?: boolean;
};
