// src/firebase/saveGameToHistory.ts
// =================================
import { useGameStore } from '@/stores/useGameStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useGameHistoryStore } from '@/stores/useGameHistoryStore'

export const saveGameToHistory = () => {
    const game = useGameStore.getState()
    const players = usePlayerStore.getState().players
    const addGameSnapshot = useGameHistoryStore.getState().addGameSnapshot

    const playerSnapshots = players.map(player => {
        const {
            id,
            nickname,
            totalBuyInChips,
            buyInChipsList,
            settleChipCount = 0,
            settleCashDiff = 0,
            settleROI = 0,
        } = player
        // compute cash rate (guard against zero or missing chip base)
        const rate = game.baseChipAmount && Number(game.baseChipAmount) !== 0
            ? (Number(game.baseCashAmount ?? 0) / Number(game.baseChipAmount))
            : 1;

        return {
            id,
            nickname,
            photoUrl: (player as any).photoUrl ?? null,
            buyInCount: (buyInChipsList || []).length,
            totalBuyInCash: (Number(totalBuyInChips) || 0) * rate,
            settleCashAmount: (Number(settleChipCount) || 0) * rate,
            settleCashDiff: Number(settleCashDiff) || 0,
            settleROI: Number(settleROI) || 0,
        } as any
    })
    const totalBuyInCash = playerSnapshots.reduce((sum, p) => sum + (p.totalBuyInCash || 0), 0)
    const totalEndingCash = playerSnapshots.reduce((sum, p) => sum + (p.settleCashAmount || 0), 0)
    const totalDiffCash = playerSnapshots.reduce((sum, p) => sum + (p.settleCashDiff || 0), 0)

    addGameSnapshot({
        id: String(game.gameId),
        created: game.created ?? new Date().toISOString(),
        updated: game.updated ?? new Date().toISOString(),
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        totalBuyInCash,
        totalEndingCash,
        totalDiffCash,
        players: playerSnapshots as any,
    })
}
