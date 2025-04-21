import { Player } from '@/types';

export function useGameStats(players: Player[]) {
    if (players.length === 0) return null;

    const mostBuyIn = [...players].sort((a, b) => b.totalBuyInChips - a.totalBuyInChips)[0];
    const leastBuyIn = [...players].sort((a, b) => a.totalBuyInChips - b.totalBuyInChips)[0];
    const mostBuyInTimes = [...players].sort((a, b) =>
        (b.buyInChipsList?.length ?? 0) - (a.buyInChipsList?.length ?? 0)
    )[0];

    const winner = [...players].sort(
        (a, b) =>
            (b.settleChipCount || 0) - b.totalBuyInChips -
            ((a.settleChipCount || 0) - a.totalBuyInChips)
    )[0];

    const loser = [...players].sort(
        (a, b) =>
            (a.settleChipCount || 0) - a.totalBuyInChips -
            ((b.settleChipCount || 0) - b.totalBuyInChips)
    )[0];

    const totalBuyIn = players.reduce((sum, p) => sum + p.totalBuyInChips, 0);
    const totalEnding = players.reduce((sum, p) => sum + (p.settleChipCount || 0), 0);
    const totalDiff = totalEnding - totalBuyIn;

    return {
        totalBuyIn,
        totalEnding,
        mostBuyIn,
        leastBuyIn,
        mostBuyInTimes,
        winner,
        loser,
        totalDiff,
    };
}
