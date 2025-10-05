export type Player = {
    id: string;
    nickname: string;
    email?: string;
    photoURL?: string;
    isActive?: boolean;
    joinAt: string; // ISO string (e.g. 2025-09-20T12:34:56.000Z)
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

export interface AddPlayerCardProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const AddPlayerTab = {
    SCAN: 'scan',
    SELECT: 'select',
    MANUAL: 'manual'
};

export type BuyInProps = {
    player: Player;
    onSubmit: (amount: number) => void;
    onCancel: () => void;
};
export interface PlayerCardProps {
    player: Player;
    index: number;
    onBuyIn: (player: Player) => void;
    onToggle: (player: Player) => void;
    onLongPress: (player: Player) => void;
    finalized: boolean;
}

export interface PlayerAvatarProps {
    player: Player;
    avatarColor: string;
    initialLetter: string;
}

export interface PlayerDetailsProps {
    player: Player;
    profit: number;
    isSettled: boolean;
}

export interface PlayerActionsProps {
    player: Player;
    finalized: boolean;
    onBuyIn: () => void;
    onToggle: () => void;
}
