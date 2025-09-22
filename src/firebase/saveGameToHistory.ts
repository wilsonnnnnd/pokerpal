import { useGameStore } from '@/stores/useGameStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useGameHistoryStore } from '@/stores/useGameHistoryStore'

type PlayerSnapshot = {
    id: string;
    nickname: string;
    photoURL: string | null;
    buyInCount: number;
    totalBuyInCash: number;
    settleCashAmount: number;
    settleCashDiff: number;
    settleROI: number;
}

type GameSnapshot = {
    id: string;
    created: string;
    updated: string;
    smallBlind?: number;
    bigBlind?: number;
    totalBuyInCash: number;
    totalEndingCash: number;
    totalDiffCash: number;
    players: PlayerSnapshot[];
}

export const saveGameToHistory = async (): Promise<void> => {
    const game = useGameStore.getState()
    const players = usePlayerStore.getState().players
    const addGameSnapshot: any = useGameHistoryStore.getState().addGameSnapshot

    const playerSnapshots: PlayerSnapshot[] = players.map(player => {
        const {
            id,
            nickname,
            totalBuyInChips,
            buyInChipsList,
            settleChipCount = 0,
            settleCashDiff = 0,
            settleROI = 0,
        } = player as any
        // compute cash rate (guard against zero or missing chip base)
        const rate = game.baseChipAmount && Number(game.baseChipAmount) !== 0
            ? (Number(game.baseCashAmount ?? 0) / Number(game.baseChipAmount))
            : 1;

        return {
            id,
            nickname,
            photoURL: (player as any).photoURL ?? null,
            buyInCount: (buyInChipsList || []).length,
            totalBuyInCash: (Number(totalBuyInChips) || 0) * rate,
            settleCashAmount: (Number(settleChipCount) || 0) * rate,
            settleCashDiff: Number(settleCashDiff) || 0,
            settleROI: Number(settleROI) || 0,
        } as PlayerSnapshot
    })

    const totalBuyInCash = playerSnapshots.reduce((sum, p) => sum + (p.totalBuyInCash || 0), 0)
    const totalEndingCash = playerSnapshots.reduce((sum, p) => sum + (p.settleCashAmount || 0), 0)
    const totalDiffCash = playerSnapshots.reduce((sum, p) => sum + (p.settleCashDiff || 0), 0)

    const snapshot: GameSnapshot = {
        id: String(game.gameId),
        created: game.created ?? new Date().toISOString(),
        updated: game.updated ?? new Date().toISOString(),
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        totalBuyInCash,
        totalEndingCash,
        totalDiffCash,
        players: playerSnapshots,
    }

    try {
        addGameSnapshot(snapshot as any);
    } catch (err) {
        // persist to history failed - rethrow so callers can handle the failure
        throw err;
    }
}
