import { formatPlayerSnapshot, formatGameNumbers } from '@/utils/formatSnapshot';

// 格式化日期时间（返回组件友好的部件）
export function formatDateTime(dateString: string) {
    if (!dateString) return { day: '--', month: '--', year: '--', time: '--:--' };
    const d = new Date(dateString);
    return {
        day: String(d.getDate()).padStart(2, '0'),
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: String(d.getFullYear()),
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
}

// 将一个原始 action 转换为 GameHistoryItem（仅当 payload 满足预期 shape）
export function toHistoryItem(action: any) {
    const payload = action.payload || null;
    if (payload && payload.players && Array.isArray(payload.players)) {
        let baseCashAmount = Number(payload.baseCashAmount ?? 0);
        let baseChipAmount = Number(payload.baseChipAmount ?? 0);

        if (!baseCashAmount) {
            baseCashAmount = Number(payload.initialCashAmount ?? payload.startCashAmount ?? 0);
        }
        if (!baseChipAmount) {
            baseChipAmount = Number(payload.initialChipAmount ?? payload.startChipAmount ?? 0);
        }

        if (!baseChipAmount && baseCashAmount > 0) {
            baseChipAmount = Number(payload.chipAmount ?? payload.chips ?? payload.startingChips ?? 0);
            if (!baseChipAmount) {
                if (baseCashAmount >= 100) {
                    baseChipAmount = baseCashAmount * 10;
                } else {
                    baseChipAmount = baseCashAmount * 100;
                }
            }
        }

        const totalBuyInCash = payload.players.reduce((sum: number, p: any) => sum + (Number(p.totalBuyInCash) || 0), 0);
        const totalEndingCash = payload.players.reduce((sum: number, p: any) => sum + (Number(p.settleCashAmount) || 0), 0);
        const totalBuyInChips = payload.players.reduce((sum: number, p: any) => sum + (Number(p.totalBuyInChips) || 0), 0);

        if (!baseCashAmount && !baseChipAmount && payload.players.length > 0) {
            const playerCount = payload.players.length;
            if (totalBuyInCash > 0) baseCashAmount = Math.round(totalBuyInCash / playerCount);
            if (totalBuyInChips > 0) baseChipAmount = Math.round(totalBuyInChips / playerCount);
        }

        const formattedPlayers = payload.players.map((p: any) => formatPlayerSnapshot(p, (baseCashAmount && baseChipAmount) ? (baseCashAmount / baseChipAmount) : undefined));
        const gameNums = formatGameNumbers({ baseCashAmount, baseChipAmount });

        return {
            id: String(action.id),
            smallBlind: Number(payload.smallBlind ?? 0),
            bigBlind: Number(payload.bigBlind ?? 0),
            created: payload.created ?? action.createdAt ?? new Date().toISOString(),
            updated: payload.updated ?? payload.created ?? action.createdAt ?? new Date().toISOString(),
            baseCashAmount: gameNums.baseCashAmount,
            baseChipAmount: gameNums.baseChipAmount,
            totalBuyInCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.totalBuyInCash || 0), 0)).toFixed(2)),
            totalEndingCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.settleCashAmount || 0), 0)).toFixed(2)),
            totalDiffCash: Number((formattedPlayers.reduce((s: number, p: any) => s + (p.settleCashDiff || 0), 0)).toFixed(2)),
            totalBuyInChips: Math.round(formattedPlayers.reduce((s: number, p: any) => s + (p.totalBuyInChips || 0), 0)),
            totalEndingChips: Math.round(formattedPlayers.reduce((s: number, p: any) => s + (p.settleChipCount || 0), 0)),
            players: formattedPlayers.map((p: any) => ({
                playerId: String(p.playerId ?? ''),
                nickname: p.nickname,
                totalBuyInCash: p.totalBuyInCash,
                settleCashAmount: p.settleCashAmount,
                settleCashDiff: p.settleCashDiff,
                buyInCount: p.buyInCount,
                photoUrl: p.photoUrl ?? null,
                settleROI: p.settleROI,
                totalBuyInChips: p.totalBuyInChips,
                settleChipCount: p.settleChipCount,
            })),
            __rawAction: action,
        };
    }
    return null;
}

export function getPlayerRanking(players: any[]) {
    if (!players.length) return { winner: null, loser: null };
    const desc = [...players].sort((a, b) => Number(b.settleCashDiff) - Number(a.settleCashDiff));
    const asc = [...players].sort((a, b) => Number(a.settleCashDiff) - Number(b.settleCashDiff));
    return { winner: desc[0], loser: asc[0] };
}
