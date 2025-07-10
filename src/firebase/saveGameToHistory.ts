import { useGameStore } from '@/stores/useGameStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { useGameHistoryStore } from '@/stores/useGameHistoryStore'

export const saveGameToHistory = () => {
    const game = useGameStore.getState()
    const players = usePlayerStore.getState().players
    const addGameSnapshot = useGameHistoryStore.getState().addGameSnapshot

    const now = new Date().toISOString()

    const playerSnapshots = players.map(player => {
        const {
            id,
            nickname,
            totalBuyInChips,
            buyInChipsList,
            settleChipCount = 0,
            settleChipDiff = 0,
            settleCashDiff = 0,
            settleROI = 0,
        } = player

        return {
            id,
            nickname,
            totalBuyInChips,
            buyInCount: buyInChipsList.length,
            endingChipCount: settleChipCount,
            chipDifference: settleChipDiff,
            cashDifference: settleCashDiff,
            roiSum: settleROI,
        }
    })

    const totalBuyIn = playerSnapshots.reduce((sum, p) => sum + p.totalBuyInChips, 0)
    const totalEnding = playerSnapshots.reduce((sum, p) => sum + p.endingChipCount, 0)

    addGameSnapshot({
        id: game.gameId,
        created: now,
        updated: now,
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        totalBuyIn,
        totalEnding,
        totalDiff: totalEnding - totalBuyIn,
        players: playerSnapshots,
    })
}
