import { useGameStore } from '@/stores/useGameStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useGameHistoryStore } from '@/stores/useGameHistoryStore';

export const saveGameToHistory = () => {
    const game = useGameStore.getState();
    const players = usePlayerStore.getState().players;
    const addGameSnapshot = useGameHistoryStore.getState().addGameSnapshot;

    const playerSnapshots = players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        totalBuyInChips: p.totalBuyInChips,
        buyInCount: p.buyInChipsList.length,
        endingChipCount: p.endingChipCount ?? 0,
        chipDifference: p.chipDifference ?? 0,
        cashDifference: p.cashDifference ?? 0,
        roi: p.roi ?? 0,
    }));

    const totalBuyIn = playerSnapshots.reduce((sum, p) => sum + p.totalBuyInChips, 0);
    const totalEnding = playerSnapshots.reduce((sum, p) => sum + p.endingChipCount, 0);

    addGameSnapshot({
        id: game.gameId,
        createdAt: new Date().toISOString(),
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind,
        baseCashAmount: game.baseCashAmount,
        baseChipAmount: game.baseChipAmount,
        totalBuyIn,
        totalEnding,
        totalDiff: totalEnding - totalBuyIn,
        players: playerSnapshots,
    });
};
